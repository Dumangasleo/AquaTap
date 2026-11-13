import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { queryRows } from '../../common/utils/sql-query.util';
import { PaymentMode } from '../../common/enums/domain.enums';
import { toDateOnlyString } from '../../common/utils/date-time.util';
import { roundMoney } from '../../common/utils/text.util';

export interface TransactionSummaryFilter {
  waterStationId: number;
  periodStart: Date;
  periodEnd: Date;
  /** Limit to one employee (their deliveries, collections and expenses). */
  employeeId?: number | null;
  /** When set, expenses are taken from this shift instead of the date range. */
  employeeShiftId?: number | null;
}

export interface TransactionSummary {
  deliveredOrders: number;
  declinedOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  inProgressOrders: number;
  pendingOrders: number;
  gallonsDelivered: number;
  gallonsReturned: number;
  /** Delivered orders paid upon delivery. */
  cashSales: number;
  /** Delivered orders on credit (utang). */
  creditSales: number;
  grossSales: number;
  /** Credit (utang) payments received in the period. */
  collections: number;
  totalReceived: number;
  receivedByMode: Record<PaymentMode, number>;
  totalExpenses: number;
  /** cashSales + collections - expenses */
  netIncome: number;
  /** Physical cash that should be on hand: cash-mode payments - expenses. */
  cashOnHand: number;
}

/**
 * Computes the money and gallon totals of a period. Shared by the daily report and by the
 * shift time-out snapshot so both always use the exact same formulas.
 */
@Injectable()
export class TransactionSummaryCalculator {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async calculate(filter: TransactionSummaryFilter): Promise<TransactionSummary> {
    const employeeCondition = filter.employeeId ? 'AND EmployeeID = ?' : '';
    const employeeParameter = filter.employeeId ? [filter.employeeId] : [];
    const periodParameters = [filter.periodStart, filter.periodEnd];

    const [closedRow] = await queryRows(
      this.dataSource,
      `SELECT
          COALESCE(SUM(OrderStatus = 'Delivered'), 0) AS DeliveredOrders,
          COALESCE(SUM(OrderStatus = 'Declined'), 0)  AS DeclinedOrders,
          COALESCE(SUM(OrderStatus = 'Cancelled'), 0) AS CancelledOrders,
          COALESCE(SUM(OrderStatus = 'Failed'), 0)    AS FailedOrders,
          COALESCE(SUM(CASE WHEN OrderStatus = 'Delivered' THEN GallonsOrdered END), 0)  AS GallonsDelivered,
          COALESCE(SUM(CASE WHEN OrderStatus = 'Delivered' THEN ReturnedGallons END), 0) AS GallonsReturned,
          COALESCE(SUM(CASE WHEN OrderStatus = 'Delivered' AND PaymentType = 'Cash' THEN TotalAmount END), 0)   AS CashSales,
          COALESCE(SUM(CASE WHEN OrderStatus = 'Delivered' AND PaymentType = 'Credit' THEN TotalAmount END), 0) AS CreditSales
         FROM CustomerOrder
        WHERE WaterStationID = ? AND ClosedAt BETWEEN ? AND ? ${employeeCondition}`,
      [filter.waterStationId, ...periodParameters, ...employeeParameter],
    );

    const [openRow] = await queryRows(
      this.dataSource,
      `SELECT
          COALESCE(SUM(OrderStatus = 'Accepted' ${filter.employeeId ? 'AND EmployeeID = ?' : ''}), 0) AS InProgressOrders,
          COALESCE(SUM(OrderStatus = 'Pending'), 0) AS PendingOrders
         FROM CustomerOrder
        WHERE WaterStationID = ? AND OrderStatus IN ('Pending', 'Accepted') AND OrderedAt <= ?`,
      [...employeeParameter, filter.waterStationId, filter.periodEnd],
    );

    const paymentRows: Array<{ PaymentMode: PaymentMode; AmountReceived: string; Collections: string }> =
      await queryRows(
        this.dataSource,
        `SELECT p.PaymentMode,
                SUM(p.AmountPaid) AS AmountReceived,
                SUM(CASE WHEN o.PaymentType = 'Credit' THEN p.AmountPaid ELSE 0 END) AS Collections
           FROM Payment p
           JOIN CustomerOrder o ON o.CustomerOrderID = p.CustomerOrderID
          WHERE p.WaterStationID = ? AND p.PaidAt BETWEEN ? AND ? ${filter.employeeId ? 'AND p.EmployeeID = ?' : ''}
          GROUP BY p.PaymentMode`,
        [filter.waterStationId, ...periodParameters, ...employeeParameter],
      );

    const totalExpenses = await this.sumExpenses(filter);

    const receivedByMode: Record<PaymentMode, number> = {
      [PaymentMode.Cash]: 0,
      [PaymentMode.GCash]: 0,
      [PaymentMode.BankTransfer]: 0,
    };
    let collections = 0;
    for (const paymentRow of paymentRows) {
      receivedByMode[paymentRow.PaymentMode] = roundMoney(Number(paymentRow.AmountReceived));
      collections += Number(paymentRow.Collections);
    }

    const cashSales = Number(closedRow.CashSales);
    const creditSales = Number(closedRow.CreditSales);
    const totalReceived = Object.values(receivedByMode).reduce((sum, amount) => sum + amount, 0);

    return {
      deliveredOrders: Number(closedRow.DeliveredOrders),
      declinedOrders: Number(closedRow.DeclinedOrders),
      cancelledOrders: Number(closedRow.CancelledOrders),
      failedOrders: Number(closedRow.FailedOrders),
      inProgressOrders: Number(openRow.InProgressOrders),
      pendingOrders: Number(openRow.PendingOrders),
      gallonsDelivered: Number(closedRow.GallonsDelivered),
      gallonsReturned: Number(closedRow.GallonsReturned),
      cashSales: roundMoney(cashSales),
      creditSales: roundMoney(creditSales),
      grossSales: roundMoney(cashSales + creditSales),
      collections: roundMoney(collections),
      totalReceived: roundMoney(totalReceived),
      receivedByMode,
      totalExpenses,
      netIncome: roundMoney(cashSales + collections - totalExpenses),
      cashOnHand: roundMoney(receivedByMode[PaymentMode.Cash] - totalExpenses),
    };
  }

  private async sumExpenses(filter: TransactionSummaryFilter): Promise<number> {
    if (filter.employeeShiftId) {
      const [row] = await queryRows(
        this.dataSource,
        `SELECT COALESCE(SUM(Amount), 0) AS TotalExpenses FROM Expense WHERE EmployeeShiftID = ?`,
        [filter.employeeShiftId],
      );
      return roundMoney(Number(row.TotalExpenses));
    }

    const [row] = await queryRows(
      this.dataSource,
      `SELECT COALESCE(SUM(Amount), 0) AS TotalExpenses
         FROM Expense
        WHERE WaterStationID = ? AND ExpenseDate BETWEEN ? AND ? ${filter.employeeId ? 'AND EmployeeID = ?' : ''}`,
      [
        filter.waterStationId,
        toDateOnlyString(filter.periodStart),
        toDateOnlyString(filter.periodEnd),
        ...(filter.employeeId ? [filter.employeeId] : []),
      ],
    );
    return roundMoney(Number(row.TotalExpenses));
  }
}
