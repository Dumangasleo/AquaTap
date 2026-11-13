import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { parseDateOnly, todayDateOnlyString } from '../../common/utils/date-time.util';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import { CustomerOrder } from '../customer-orders/customer-order.entity';
import { toCustomerOrderResponse } from '../customer-orders/customer-order.mapper';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { toEmployeeShiftResponse } from '../employee-shifts/employee-shift.mapper';
import { Expense } from '../expenses/expense.entity';
import { toExpenseResponse } from '../expenses/expense.mapper';
import { DailyReportQueryDto, DailyReportResponse } from './dto/report.dto';
import { TransactionSummaryCalculator } from './transaction-summary.calculator';

/**
 * "List of all transactions in a day": every order that was closed that day (delivered, declined,
 * cancelled, failed) plus the ones still open, the expenses, the shifts and the computed totals.
 */
@Injectable()
export class DailyReportService {
  constructor(
    @InjectRepository(CustomerOrder) private readonly customerOrderRepository: Repository<CustomerOrder>,
    @InjectRepository(Expense) private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(EmployeeShift) private readonly employeeShiftRepository: Repository<EmployeeShift>,
    private readonly transactionSummaryCalculator: TransactionSummaryCalculator,
  ) {}

  async getDailyReport(user: AuthenticatedUser, query: DailyReportQueryDto): Promise<DailyReportResponse> {
    const waterStationId = requireWaterStationId(user);
    const date = query.date ?? todayDateOnlyString();
    // Employees only see their own records; the admin sees everyone (or filters one employee).
    const employeeId = user.role === UserRole.Admin ? (query.employeeId ?? null) : user.employeeId;

    const periodStart = parseDateOnly(date, 0, 0, 0);
    const periodEnd = parseDateOnly(date, 23, 59, 59);

    const [summary, transactions, expenses, shifts] = await Promise.all([
      this.transactionSummaryCalculator.calculate({ waterStationId, employeeId, periodStart, periodEnd }),
      this.findTransactions(waterStationId, date, employeeId),
      this.expenseRepository.find({
        where: { waterStationId, expenseDate: date, ...(employeeId ? { employeeId } : {}) },
        relations: { employee: true },
        order: { createdAt: 'DESC' },
      }),
      this.employeeShiftRepository.find({
        where: { waterStationId, shiftDate: date, ...(employeeId ? { employeeId } : {}) },
        relations: { employee: true },
        order: { timeIn: 'ASC' },
      }),
    ]);

    return {
      date,
      employeeId,
      summary,
      transactions: transactions.map((order) => toCustomerOrderResponse(order, user.employeeId)),
      expenses: expenses.map(toExpenseResponse),
      shifts: shifts.map(toEmployeeShiftResponse),
    };
  }

  private findTransactions(
    waterStationId: number,
    date: string,
    employeeId: number | null,
  ): Promise<CustomerOrder[]> {
    const queryBuilder = this.customerOrderRepository
      .createQueryBuilder('customerOrder')
      .leftJoinAndSelect('customerOrder.customer', 'customer')
      .leftJoinAndSelect('customerOrder.employee', 'employee')
      .where('customerOrder.waterStationId = :waterStationId', { waterStationId })
      .andWhere(
        new Brackets((dateCondition) => {
          dateCondition
            .where('DATE(customerOrder.closedAt) = :date', { date })
            .orWhere(
              'customerOrder.closedAt IS NULL AND (DATE(customerOrder.orderedAt) = :date OR DATE(customerOrder.acceptedAt) = :date)',
              { date },
            );
        }),
      );

    if (employeeId) {
      queryBuilder.andWhere('customerOrder.employeeId = :employeeId', { employeeId });
    }

    return queryBuilder
      .orderBy('COALESCE(customerOrder.closedAt, customerOrder.orderedAt)', 'DESC')
      .getMany();
  }
}
