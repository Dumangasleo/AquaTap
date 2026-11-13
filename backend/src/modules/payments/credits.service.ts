import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { OrderStatus, PaymentStatus, PaymentType } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { resolvePaymentDateTime, todayDateOnlyString } from '../../common/utils/date-time.util';
import { roundMoney } from '../../common/utils/text.util';
import { requireEmployeeId, requireWaterStationId } from '../../common/utils/user-scope.util';
import { CustomerOrder } from '../customer-orders/customer-order.entity';
import {
  CreditListResponse,
  CreditQueryDto,
  SettleCreditsDto,
  SettleCreditsResponse,
} from './dto/credit.dto';
import { Payment } from './payment.entity';

/** Credits = delivered orders with PaymentType "Credit" (utang). */
@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(CustomerOrder) private readonly customerOrderRepository: Repository<CustomerOrder>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listCredits(user: AuthenticatedUser, query: CreditQueryDto): Promise<CreditListResponse> {
    const waterStationId = requireWaterStationId(user);
    const paymentStatus = query.paymentStatus ?? PaymentStatus.Unpaid;

    const queryBuilder = this.customerOrderRepository
      .createQueryBuilder('customerOrder')
      .innerJoinAndSelect('customerOrder.customer', 'customer')
      .leftJoinAndSelect('customerOrder.employee', 'employee')
      .where('customerOrder.waterStationId = :waterStationId', { waterStationId })
      .andWhere('customerOrder.orderStatus = :delivered', { delivered: OrderStatus.Delivered })
      .andWhere('customerOrder.paymentType = :credit', { credit: PaymentType.Credit })
      .andWhere('customerOrder.paymentStatus = :paymentStatus', { paymentStatus });

    if (query.search?.trim()) {
      queryBuilder.andWhere('(customer.fullName LIKE :search OR customerOrder.orderNumber LIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }
    if (query.dateFrom) {
      queryBuilder.andWhere('DATE(customerOrder.orderedAt) >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      queryBuilder.andWhere('DATE(customerOrder.orderedAt) <= :dateTo', { dateTo: query.dateTo });
    }

    const orders = await queryBuilder
      .orderBy('customer.fullName', 'ASC')
      .addOrderBy('customerOrder.orderedAt', 'ASC')
      .take(query.limit ?? 300)
      .getMany();

    const items = orders.map((order) => ({
      customerOrderId: order.customerOrderId,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customer?.fullName ?? '',
      contactNumber: order.customer?.contactNumber ?? '',
      orderedAt: order.orderedAt,
      deliveredAt: order.deliveredAt,
      gallonsOrdered: order.gallonsOrdered,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      paymentMode: order.paymentMode,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
      handledByName: order.employee?.fullName ?? null,
    }));

    return {
      items,
      totalCount: items.length,
      totalAmount: roundMoney(items.reduce((sum, item) => sum + item.totalAmount, 0)),
    };
  }

  /** Marks the selected unpaid credit orders as paid and records the date of payment. */
  async settleCredits(user: AuthenticatedUser, settleDto: SettleCreditsDto): Promise<SettleCreditsResponse> {
    const waterStationId = requireWaterStationId(user);
    const employeeId = requireEmployeeId(user);

    if (settleDto.paidOn && settleDto.paidOn > todayDateOnlyString()) {
      throw new BadRequestException('The date of payment cannot be in the future.');
    }
    const paidAt = resolvePaymentDateTime(settleDto.paidOn);
    const uniqueOrderIds = [...new Set(settleDto.customerOrderIds)];

    return this.dataSource.transaction(async (manager) => {
      const orders = await manager.find(CustomerOrder, {
        where: { customerOrderId: In(uniqueOrderIds), waterStationId },
        lock: { mode: 'pessimistic_write' },
      });

      const invalidOrder = orders.find(
        (order) =>
          order.orderStatus !== OrderStatus.Delivered ||
          order.paymentType !== PaymentType.Credit ||
          order.paymentStatus !== PaymentStatus.Unpaid,
      );
      if (orders.length !== uniqueOrderIds.length || invalidOrder) {
        throw new BadRequestException(
          invalidOrder
            ? `Order ${invalidOrder.orderNumber} is not an unpaid credit anymore. Please refresh the list.`
            : 'Some selected orders were not found.',
        );
      }

      const referenceNumber = settleDto.referenceNumber?.trim() || null;
      for (const order of orders) {
        await manager.update(CustomerOrder, order.customerOrderId, {
          paymentStatus: PaymentStatus.Paid,
          paymentMode: settleDto.paymentMode,
          paymentReference: referenceNumber ?? order.paymentReference,
          paidAt,
        });
        await manager.save(
          manager.create(Payment, {
            customerOrderId: order.customerOrderId,
            waterStationId,
            customerId: order.customerId,
            employeeId,
            amountPaid: order.totalAmount,
            paymentMode: settleDto.paymentMode,
            referenceNumber: referenceNumber ?? order.paymentReference,
            paidAt,
            remarks: settleDto.remarks?.trim() || 'Credit (utang) payment',
          }),
        );
      }

      return {
        settledCount: orders.length,
        totalAmountPaid: roundMoney(orders.reduce((sum, order) => sum + order.totalAmount, 0)),
        paidAt,
      };
    });
  }
}
