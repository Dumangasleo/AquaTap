import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DateQueryDto } from '../../../common/dto/common-query.dto';
import { ExpenseCategory } from '../../../common/enums/domain.enums';
import { CustomerOrderResponse } from '../../customer-orders/dto/customer-order.dto';
import { EmployeeShiftResponse } from '../../employee-shifts/dto/employee-shift.dto';
import { ExpenseResponse } from '../../expenses/dto/expense.dto';
import { TransactionSummary } from '../transaction-summary.calculator';

export class DailyReportQueryDto extends DateQueryDto {
  /** Admin only: show one employee. Employees always see their own records. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;
}

export class BusinessSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class DailyReportResponse {
  date: string;
  employeeId: number | null;
  summary: TransactionSummary;
  transactions: CustomerOrderResponse[];
  expenses: ExpenseResponse[];
  shifts: EmployeeShiftResponse[];
}

export class MonthlyBusinessFigures {
  month: number;
  monthLabel: string;
  deliveredOrders: number;
  gallonsDelivered: number;
  sales: number;
  collections: number;
  expenses: number;
  /** sales - expenses */
  netIncome: number;
  newCustomers: number;
}

export class BusinessTotals {
  deliveredOrders: number;
  gallonsDelivered: number;
  sales: number;
  collections: number;
  expenses: number;
  netIncome: number;
  newCustomers: number;
}

export class ExpenseCategoryTotal {
  expenseCategory: ExpenseCategory;
  amount: number;
}

export class BusinessSummaryResponse {
  year: number;
  months: MonthlyBusinessFigures[];
  totals: BusinessTotals;
  expensesByCategory: ExpenseCategoryTotal[];
  outstandingCredits: number;
  totalCustomers: number;
}
