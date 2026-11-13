import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { DATE_ONLY_MESSAGE, DATE_ONLY_PATTERN } from '../../../common/dto/common-query.dto';
import { ExpenseCategory } from '../../../common/enums/domain.enums';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory, { message: 'Choose an expense category.' })
  expenseCategory: ExpenseCategory;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter a valid amount.' })
  @Min(1, { message: 'Amount must be at least ₱1.' })
  @Max(1_000_000)
  amount: number;

  /** e.g. "Lunch", "Gasoline 2L", "Flat tire vulcanize" */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** YYYY-MM-DD, defaults to today. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: `expenseDate ${DATE_ONLY_MESSAGE}` })
  expenseDate?: string;
}

export class ExpenseResponse {
  expenseId: number;
  expenseCategory: ExpenseCategory;
  amount: number;
  description: string | null;
  expenseDate: string;
  employeeId: number | null;
  employeeName: string | null;
  createdAt: Date;
}
