import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { queryRows } from '../../common/utils/sql-query.util';
import { ExpenseCategory } from '../../common/enums/domain.enums';
import { roundMoney } from '../../common/utils/text.util';
import { BusinessSummaryResponse, MonthlyBusinessFigures } from './dto/report.dto';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type MonthlyRow = { MonthNumber: number } & Record<string, string | number>;

/**
 * Yearly business figures per month: gallons delivered, sales, collections, expenses, income and
 * new customers. Built for the admin dashboard (mobile now, web admin later).
 */
@Injectable()
export class BusinessSummaryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getYearSummary(waterStationId: number, year: number): Promise<BusinessSummaryResponse> {
    const yearStart = `${year}-01-01 00:00:00`;
    const nextYearStart = `${year + 1}-01-01 00:00:00`;
    const rangeParameters = [waterStationId, yearStart, nextYearStart];

    const [
      deliveryRows,
      paymentRows,
      expenseRows,
      customerRows,
      categoryRows,
      [creditRow],
      [customerCountRow],
    ] = await Promise.all([
      queryRows<MonthlyRow>(
        this.dataSource,
        `SELECT MONTH(DeliveredAt) AS MonthNumber, COUNT(*) AS DeliveredOrders,
                  SUM(GallonsOrdered) AS GallonsDelivered, SUM(TotalAmount) AS Sales
             FROM CustomerOrder
            WHERE WaterStationID = ? AND OrderStatus = 'Delivered' AND DeliveredAt >= ? AND DeliveredAt < ?
            GROUP BY MONTH(DeliveredAt)`,
        rangeParameters,
      ),
      queryRows<MonthlyRow>(
        this.dataSource,
        `SELECT MONTH(PaidAt) AS MonthNumber, SUM(AmountPaid) AS Collections
             FROM Payment WHERE WaterStationID = ? AND PaidAt >= ? AND PaidAt < ?
            GROUP BY MONTH(PaidAt)`,
        rangeParameters,
      ),
      queryRows<MonthlyRow>(
        this.dataSource,
        `SELECT MONTH(ExpenseDate) AS MonthNumber, SUM(Amount) AS Expenses
             FROM Expense WHERE WaterStationID = ? AND ExpenseDate >= ? AND ExpenseDate < ?
            GROUP BY MONTH(ExpenseDate)`,
        rangeParameters,
      ),
      queryRows<MonthlyRow>(
        this.dataSource,
        `SELECT MONTH(CreatedAt) AS MonthNumber, COUNT(*) AS NewCustomers
             FROM Customer WHERE WaterStationID = ? AND CreatedAt >= ? AND CreatedAt < ?
            GROUP BY MONTH(CreatedAt)`,
        rangeParameters,
      ),
      queryRows<{ ExpenseCategory: ExpenseCategory; Amount: string }>(
        this.dataSource,
        `SELECT ExpenseCategory, SUM(Amount) AS Amount
             FROM Expense WHERE WaterStationID = ? AND ExpenseDate >= ? AND ExpenseDate < ?
            GROUP BY ExpenseCategory ORDER BY Amount DESC`,
        rangeParameters,
      ),
      queryRows(
        this.dataSource,
        `SELECT COALESCE(SUM(TotalAmount), 0) AS OutstandingCredits
             FROM CustomerOrder
            WHERE WaterStationID = ? AND OrderStatus = 'Delivered' AND PaymentType = 'Credit' AND PaymentStatus = 'Unpaid'`,
        [waterStationId],
      ),
      queryRows(this.dataSource, `SELECT COUNT(*) AS TotalCustomers FROM Customer WHERE WaterStationID = ?`, [
        waterStationId,
      ]),
    ]);

    const valueForMonth = (rows: MonthlyRow[], month: number, column: string): number =>
      Number(rows.find((row) => Number(row.MonthNumber) === month)?.[column] ?? 0);

    const months: MonthlyBusinessFigures[] = MONTH_LABELS.map((monthLabel, index) => {
      const month = index + 1;
      const sales = roundMoney(valueForMonth(deliveryRows, month, 'Sales'));
      const expenses = roundMoney(valueForMonth(expenseRows, month, 'Expenses'));
      return {
        month,
        monthLabel,
        deliveredOrders: valueForMonth(deliveryRows, month, 'DeliveredOrders'),
        gallonsDelivered: valueForMonth(deliveryRows, month, 'GallonsDelivered'),
        sales,
        collections: roundMoney(valueForMonth(paymentRows, month, 'Collections')),
        expenses,
        netIncome: roundMoney(sales - expenses),
        newCustomers: valueForMonth(customerRows, month, 'NewCustomers'),
      };
    });

    const sumOf = (key: keyof Omit<MonthlyBusinessFigures, 'month' | 'monthLabel'>) =>
      roundMoney(months.reduce((total, monthFigures) => total + monthFigures[key], 0));

    return {
      year,
      months,
      totals: {
        deliveredOrders: sumOf('deliveredOrders'),
        gallonsDelivered: sumOf('gallonsDelivered'),
        sales: sumOf('sales'),
        collections: sumOf('collections'),
        expenses: sumOf('expenses'),
        netIncome: sumOf('netIncome'),
        newCustomers: sumOf('newCustomers'),
      },
      expensesByCategory: categoryRows.map((row) => ({
        expenseCategory: row.ExpenseCategory,
        amount: roundMoney(Number(row.Amount)),
      })),
      outstandingCredits: roundMoney(Number(creditRow.OutstandingCredits)),
      totalCustomers: Number(customerCountRow.TotalCustomers),
    };
  }
}
