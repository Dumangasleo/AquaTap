import { ExpenseResponse } from './dto/expense.dto';
import { Expense } from './expense.entity';

export function toExpenseResponse(expense: Expense): ExpenseResponse {
  return {
    expenseId: expense.expenseId,
    expenseCategory: expense.expenseCategory,
    amount: expense.amount,
    description: expense.description,
    expenseDate: expense.expenseDate,
    employeeId: expense.employeeId,
    employeeName: expense.employee?.fullName ?? null,
    createdAt: expense.createdAt,
  };
}
