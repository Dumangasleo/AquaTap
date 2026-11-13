import { Body, Controller, Delete, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, STAFF_ROLES } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { formatPeso, humanizeEnumName } from '../../common/utils/text.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { CreateExpenseDto, ExpenseResponse } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

/** Expenses are listed inside the daily report (GET /reports/daily). */
@ApiTags('Expenses')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @RecordActivity<ExpenseResponse>({
    type: ActivityType.ExpenseAdded,
    describe: ({ result }) =>
      `Added an expense: ${humanizeEnumName(result.expenseCategory)} ${formatPeso(result.amount)}`,
  })
  createExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreateExpenseDto,
  ): Promise<ExpenseResponse> {
    return this.expensesService.createExpense(user, createDto);
  }

  @Delete(':expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RecordActivity({ type: ActivityType.ExpenseDeleted, describe: () => 'Deleted an expense' })
  deleteExpense(
    @CurrentUser() user: AuthenticatedUser,
    @Param('expenseId', ParseIntPipe) expenseId: number,
  ): Promise<void> {
    return this.expensesService.deleteExpense(user, expenseId);
  }
}
