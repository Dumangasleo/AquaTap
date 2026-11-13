import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { PaymentMode, PaymentStatus, PaymentType, UserRole } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  requireCustomerId,
  requireEmployeeId,
  requireWaterStationId,
} from '../../common/utils/user-scope.util';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { GallonLedgerService } from '../gallon-contracts/gallon-ledger.service';
import { Payment } from '../payments/payment.entity';
import { CustomerOrder } from './customer-order.entity';
import { CustomerOrdersService } from './customer-orders.service';
import {
  CancelOrderDto,
  CustomerOrderResponse,
  DeliverOrderDto,
  OrderReasonDto,
} from './dto/customer-order.dto';
import { OrderAction, OrderStatusPolicy } from './order-status.policy';
import { currentDateTime } from '../../common/utils/date-time.util';

/**
 * Every status change of an order: accept, decline, cancel, deliver, fail.
 * Each change is an atomic conditional UPDATE ("... WHERE OrderStatus IN (allowed)") so two
 * employees can never accept the same order at the same time.
 */
@Injectable()
export class OrderWorkflowService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly orderStatusPolicy: OrderStatusPolicy,
    private readonly gallonLedgerService: GallonLedgerService,
    private readonly customerOrdersService: CustomerOrdersService,
  ) {}

  async acceptOrder(user: AuthenticatedUser, customerOrderId: number): Promise<CustomerOrderResponse> {
    const employeeId = requireEmployeeId(user);
    const order = await this.findStationOrder(user, customerOrderId);
    this.orderStatusPolicy.assertCanTransition(order.orderStatus, 'accept');

    const activeShift = await this.dataSource.manager.findOne(EmployeeShift, {
      where: { employeeId, timeOut: IsNull() },
      order: { timeIn: 'DESC' },
    });

    await this.applyTransition(this.dataSource.manager, order, 'accept', {
      employeeId,
      employeeShiftId: activeShift?.employeeShiftId ?? null,
      acceptedAt: currentDateTime(),
    });
    return this.customerOrdersService.getOrderForUser(user, customerOrderId);
  }

  async declineOrder(
    user: AuthenticatedUser,
    customerOrderId: number,
    reasonDto: OrderReasonDto,
  ): Promise<CustomerOrderResponse> {
    const employeeId = requireEmployeeId(user);
    const order = await this.findStationOrder(user, customerOrderId);
    this.orderStatusPolicy.assertCanTransition(order.orderStatus, 'decline');

    await this.applyTransition(this.dataSource.manager, order, 'decline', {
      employeeId,
      statusReason: reasonDto.reason.trim(),
      closedAt: currentDateTime(),
    });
    return this.customerOrdersService.getOrderForUser(user, customerOrderId);
  }

  async cancelOrder(
    user: AuthenticatedUser,
    customerOrderId: number,
    cancelDto: CancelOrderDto,
  ): Promise<CustomerOrderResponse> {
    const customerId = requireCustomerId(user);
    const order = await this.findStationOrder(user, customerOrderId);
    if (order.customerId !== customerId) throw new NotFoundException('Order not found.');
    this.orderStatusPolicy.assertCanTransition(order.orderStatus, 'cancel');

    await this.applyTransition(this.dataSource.manager, order, 'cancel', {
      statusReason: cancelDto.reason?.trim() || 'Cancelled by customer',
      closedAt: currentDateTime(),
    });
    return this.customerOrdersService.getOrderForUser(user, customerOrderId);
  }

  /**
   * Rider confirms delivery: records the empty gallons returned and, for Cash orders,
   * records the payment. Credit orders stay Unpaid and appear in the Credits (utang) list.
   */
  async deliverOrder(
    user: AuthenticatedUser,
    customerOrderId: number,
    deliverDto: DeliverOrderDto,
  ): Promise<CustomerOrderResponse> {
    const employeeId = requireEmployeeId(user);

    await this.dataSource.transaction(async (manager) => {
      const order = await this.findStationOrder(user, customerOrderId, manager, true);
      this.orderStatusPolicy.assertCanTransition(order.orderStatus, 'deliver');
      this.assertCanHandle(user, order);

      // This order is not Delivered yet, so the balance below is what the customer held before it.
      const balance = await this.gallonLedgerService.getGallonBalance(order.customerId, manager);
      if (deliverDto.returnedGallons > balance.remainingGallons) {
        throw new BadRequestException(
          `The customer only has ${balance.remainingGallons} borrowed gallon(s) to return.`,
        );
      }

      const deliveredAt = currentDateTime();
      const isCash = order.paymentType === PaymentType.Cash;
      const paymentMode = isCash ? (deliverDto.paymentMode ?? order.paymentMode ?? PaymentMode.Cash) : null;
      const paymentReference = deliverDto.paymentReference?.trim() || order.paymentReference;

      if (isCash && paymentMode !== PaymentMode.Cash && !paymentReference) {
        throw new BadRequestException('Please enter the GCash / bank transfer reference number.');
      }

      await this.applyTransition(manager, order, 'deliver', {
        returnedGallons: deliverDto.returnedGallons,
        deliveredAt,
        closedAt: deliveredAt,
        employeeId: order.employeeId ?? employeeId,
        ...(isCash
          ? { paymentMode, paymentReference, paymentStatus: PaymentStatus.Paid, paidAt: deliveredAt }
          : {}),
      });

      if (isCash && paymentMode) {
        await manager.save(
          manager.create(Payment, {
            customerOrderId: order.customerOrderId,
            waterStationId: order.waterStationId,
            customerId: order.customerId,
            employeeId,
            amountPaid: order.totalAmount,
            paymentMode,
            referenceNumber: paymentReference,
            paidAt: deliveredAt,
            remarks: 'Paid upon delivery',
          }),
        );
      }
    });

    return this.customerOrdersService.getOrderForUser(user, customerOrderId);
  }

  async failOrder(
    user: AuthenticatedUser,
    customerOrderId: number,
    reasonDto: OrderReasonDto,
  ): Promise<CustomerOrderResponse> {
    requireEmployeeId(user);
    const order = await this.findStationOrder(user, customerOrderId);
    this.orderStatusPolicy.assertCanTransition(order.orderStatus, 'fail');
    this.assertCanHandle(user, order);

    await this.applyTransition(this.dataSource.manager, order, 'fail', {
      statusReason: reasonDto.reason.trim(),
      closedAt: currentDateTime(),
    });
    return this.customerOrdersService.getOrderForUser(user, customerOrderId);
  }

  /** Only the employee who accepted the order (or the admin) can complete it. */
  private assertCanHandle(user: AuthenticatedUser, order: CustomerOrder): void {
    if (user.role === UserRole.Admin) return;
    if (order.employeeId !== user.employeeId) {
      throw new ForbiddenException('This order is assigned to another employee.');
    }
  }

  private async findStationOrder(
    user: AuthenticatedUser,
    customerOrderId: number,
    manager: EntityManager = this.dataSource.manager,
    lockForUpdate = false,
  ): Promise<CustomerOrder> {
    const order = await manager.findOne(CustomerOrder, {
      where: { customerOrderId, waterStationId: requireWaterStationId(user) },
      ...(lockForUpdate ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  private async applyTransition(
    manager: EntityManager,
    order: CustomerOrder,
    action: OrderAction,
    changes: Partial<CustomerOrder>,
  ): Promise<void> {
    const rule = this.orderStatusPolicy.getRule(action);
    const result = await manager.update(
      CustomerOrder,
      { customerOrderId: order.customerOrderId, orderStatus: In(rule.allowedFrom) },
      { ...changes, orderStatus: rule.nextStatus },
    );
    if (!result.affected) {
      throw new ConflictException(
        'This order was just updated by someone else. Please refresh and try again.',
      );
    }
  }
}
