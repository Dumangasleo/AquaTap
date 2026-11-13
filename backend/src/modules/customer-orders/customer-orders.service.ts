import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import {
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  PaymentType,
  UserRole,
} from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireCustomerId, requireWaterStationId } from '../../common/utils/user-scope.util';
import { roundMoney } from '../../common/utils/text.util';
import { Customer } from '../customers/customer.entity';
import { GallonLedgerService } from '../gallon-contracts/gallon-ledger.service';
import { WaterStationsService } from '../water-stations/water-stations.service';
import { CustomerOrder } from './customer-order.entity';
import { toCustomerOrderResponse } from './customer-order.mapper';
import {
  CreateCustomerOrderDto,
  CustomerOrderQueryDto,
  CustomerOrderResponse,
  PendingOrderCountResponse,
  StaffOrderQueryDto,
  SubmitPaymentReferenceDto,
} from './dto/customer-order.dto';
import { OrderNumberGenerator } from './order-number.generator';
import { currentDateTime } from '../../common/utils/date-time.util';

const MAX_ACTIVE_ORDERS_PER_CUSTOMER = 3;
const ORDER_RELATIONS = { customer: true, employee: true } as const;

/** Placing orders and reading them. State changes live in OrderWorkflowService (Single Responsibility). */
@Injectable()
export class CustomerOrdersService {
  constructor(
    @InjectRepository(CustomerOrder) private readonly customerOrderRepository: Repository<CustomerOrder>,
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    private readonly waterStationsService: WaterStationsService,
    private readonly gallonLedgerService: GallonLedgerService,
    private readonly orderNumberGenerator: OrderNumberGenerator,
  ) {}

  async placeOrder(
    user: AuthenticatedUser,
    createDto: CreateCustomerOrderDto,
  ): Promise<CustomerOrderResponse> {
    const customerId = requireCustomerId(user);
    const waterStationId = requireWaterStationId(user);

    const customer = await this.customerRepository.findOne({ where: { customerId, waterStationId } });
    if (!customer) throw new NotFoundException('Customer profile not found.');

    const activeOrderCount = await this.customerOrderRepository.count({
      where: { customerId, orderStatus: In([OrderStatus.Pending, OrderStatus.Accepted]) },
    });
    if (activeOrderCount >= MAX_ACTIVE_ORDERS_PER_CUSTOMER) {
      throw new BadRequestException(
        `You already have ${activeOrderCount} active orders. Please wait for them to be delivered first.`,
      );
    }

    const expectedReturnedGallons = createDto.returnedGallons ?? 0;
    const gallonBalance = await this.gallonLedgerService.getGallonBalance(customerId);
    if (expectedReturnedGallons > gallonBalance.remainingGallons) {
      throw new BadRequestException(
        `You only have ${gallonBalance.remainingGallons} borrowed gallon(s) to return.`,
      );
    }

    const station = await this.waterStationsService.findActiveStationOrThrow(waterStationId);
    const isCash = createDto.paymentType === PaymentType.Cash;
    const orderedAt = currentDateTime();

    const order = this.customerOrderRepository.create({
      waterStationId,
      customerId,
      employeeId: null,
      employeeShiftId: null,
      gallonsOrdered: createDto.gallonsOrdered,
      returnedGallons: expectedReturnedGallons,
      pricePerGallon: station.pricePerGallon,
      totalAmount: roundMoney(createDto.gallonsOrdered * station.pricePerGallon),
      paymentType: createDto.paymentType,
      paymentMode: isCash ? (createDto.paymentMode ?? PaymentMode.Cash) : null,
      paymentStatus: PaymentStatus.Unpaid,
      paymentReference: createDto.paymentReference?.trim() || null,
      deliveryAddress: createDto.deliveryAddress?.trim() || customer.address,
      deliveryLatitude: createDto.deliveryLatitude ?? customer.latitude,
      deliveryLongitude: createDto.deliveryLongitude ?? customer.longitude,
      customerNotes: createDto.customerNotes?.trim() || null,
      orderStatus: OrderStatus.Pending,
      statusReason: null,
      orderedAt,
    });

    const savedOrder = await this.saveWithUniqueOrderNumber(order);
    return this.getOrderForUser(user, savedOrder.customerOrderId);
  }

  async listCustomerOrders(
    user: AuthenticatedUser,
    query: CustomerOrderQueryDto,
  ): Promise<CustomerOrderResponse[]> {
    const customerId = requireCustomerId(user);
    const orders = await this.customerOrderRepository.find({
      where: {
        customerId,
        ...(query.statuses?.length ? { orderStatus: In(query.statuses) } : {}),
        ...(query.paymentType ? { paymentType: query.paymentType } : {}),
        ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      },
      relations: ORDER_RELATIONS,
      order: { orderedAt: 'DESC', customerOrderId: 'DESC' },
      take: query.limit ?? 100,
    });
    return orders.map((order) => toCustomerOrderResponse(order));
  }

  async listStationOrders(
    user: AuthenticatedUser,
    query: StaffOrderQueryDto,
  ): Promise<CustomerOrderResponse[]> {
    const waterStationId = requireWaterStationId(user);
    const isPendingOnly = query.statuses?.length === 1 && query.statuses[0] === OrderStatus.Pending;

    const queryBuilder = this.customerOrderRepository
      .createQueryBuilder('customerOrder')
      .leftJoinAndSelect('customerOrder.customer', 'customer')
      .leftJoinAndSelect('customerOrder.employee', 'employee')
      .where('customerOrder.waterStationId = :waterStationId', { waterStationId });

    if (query.statuses?.length) {
      queryBuilder.andWhere('customerOrder.orderStatus IN (:...statuses)', { statuses: query.statuses });
    }
    if (query.date) {
      queryBuilder.andWhere('DATE(COALESCE(customerOrder.closedAt, customerOrder.orderedAt)) = :date', {
        date: query.date,
      });
    }
    if (query.search?.trim()) {
      queryBuilder.andWhere('(customer.fullName LIKE :search OR customerOrder.orderNumber LIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    const orders = await queryBuilder
      // Pending orders: oldest first (first come, first served). Others: newest first.
      .orderBy('customerOrder.orderedAt', isPendingOnly ? 'ASC' : 'DESC')
      .addOrderBy('customerOrder.customerOrderId', isPendingOnly ? 'ASC' : 'DESC')
      .take(query.limit ?? 200)
      .getMany();

    return orders.map((order) => toCustomerOrderResponse(order, user.employeeId));
  }

  async getPendingCounts(user: AuthenticatedUser): Promise<PendingOrderCountResponse> {
    const waterStationId = requireWaterStationId(user);
    const [pendingCount, myActiveCount] = await Promise.all([
      this.customerOrderRepository.count({ where: { waterStationId, orderStatus: OrderStatus.Pending } }),
      user.employeeId
        ? this.customerOrderRepository.count({
            where: { waterStationId, employeeId: user.employeeId, orderStatus: OrderStatus.Accepted },
          })
        : Promise.resolve(0),
    ]);
    return { pendingCount, myActiveCount };
  }

  /** Customers can only open their own orders; staff can open any order of their station. */
  async getOrderForUser(user: AuthenticatedUser, customerOrderId: number): Promise<CustomerOrderResponse> {
    const order = await this.findOrderVisibleToUser(user, customerOrderId);
    return toCustomerOrderResponse(order, user.employeeId);
  }

  async findOrderVisibleToUser(user: AuthenticatedUser, customerOrderId: number): Promise<CustomerOrder> {
    const waterStationId = requireWaterStationId(user);
    const order = await this.customerOrderRepository.findOne({
      where:
        user.role === UserRole.Customer
          ? { customerOrderId, waterStationId, customerId: requireCustomerId(user) }
          : { customerOrderId, waterStationId },
      relations: ORDER_RELATIONS,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  /** Customer sends the GCash / bank reference number of an online payment for the station to verify. */
  async submitPaymentReference(
    user: AuthenticatedUser,
    customerOrderId: number,
    referenceDto: SubmitPaymentReferenceDto,
  ): Promise<CustomerOrderResponse> {
    const order = await this.findOrderVisibleToUser(user, customerOrderId);
    const closedWithoutDelivery = [OrderStatus.Declined, OrderStatus.Cancelled, OrderStatus.Failed];
    if (order.paymentStatus === PaymentStatus.Paid || closedWithoutDelivery.includes(order.orderStatus)) {
      throw new BadRequestException('This order does not need a payment.');
    }

    await this.customerOrderRepository.update(customerOrderId, {
      paymentMode: referenceDto.paymentMode,
      paymentReference: referenceDto.paymentReference.trim(),
    });
    return this.getOrderForUser(user, customerOrderId);
  }

  private async saveWithUniqueOrderNumber(order: CustomerOrder): Promise<CustomerOrder> {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      order.orderNumber = this.orderNumberGenerator.generate(order.orderedAt);
      try {
        return await this.customerOrderRepository.save(order);
      } catch (error) {
        const isDuplicate =
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string } | undefined)?.code === 'ER_DUP_ENTRY';
        if (!isDuplicate || attempt === maxAttempts) throw error;
      }
    }
    throw new ConflictException('Could not create the order. Please try again.');
  }
}
