import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { todayDateOnlyString } from '../../common/utils/date-time.util';
import { requireEmployeeId, requireWaterStationId } from '../../common/utils/user-scope.util';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { CreateExpenseDto, ExpenseResponse } from './dto/expense.dto';
import { Expense } from './expense.entity';
import { toExpenseResponse } from './expense.mapper';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(EmployeeShift) private readonly employeeShiftRepository: Repository<EmployeeShift>,
  ) {}

  /** Records an expense (food, fuel, flat tire...) and links it to the employee's open shift. */
  async createExpense(user: AuthenticatedUser, createDto: CreateExpenseDto): Promise<ExpenseResponse> {
    const waterStationId = requireWaterStationId(user);
    const employeeId = requireEmployeeId(user);
    const expenseDate = createDto.expenseDate ?? todayDateOnlyString();
    if (expenseDate > todayDateOnlyString()) {
      throw new BadRequestException('The expense date cannot be in the future.');
    }

    const openShift = await this.employeeShiftRepository.findOne({
      where: { employeeId, timeOut: IsNull() },
      order: { timeIn: 'DESC' },
    });

    const expense = await this.expenseRepository.save(
      this.expenseRepository.create({
        waterStationId,
        employeeId,
        employeeShiftId: expenseDate === todayDateOnlyString() ? (openShift?.employeeShiftId ?? null) : null,
        expenseCategory: createDto.expenseCategory,
        amount: createDto.amount,
        description: createDto.description?.trim() || null,
        expenseDate,
      }),
    );

    const savedExpense = await this.expenseRepository.findOneOrFail({
      where: { expenseId: expense.expenseId },
      relations: { employee: true },
    });
    return toExpenseResponse(savedExpense);
  }

  /** Admin can delete any expense; employees can delete only their own expenses of today. */
  async deleteExpense(user: AuthenticatedUser, expenseId: number): Promise<void> {
    const waterStationId = requireWaterStationId(user);
    const expense = await this.expenseRepository.findOne({ where: { expenseId, waterStationId } });
    if (!expense) throw new NotFoundException('Expense not found.');

    const isOwnExpenseToday =
      expense.employeeId === user.employeeId && expense.expenseDate === todayDateOnlyString();
    if (user.role !== UserRole.Admin && !isOwnExpenseToday) {
      throw new ForbiddenException('You can only delete your own expenses recorded today.');
    }
    await this.expenseRepository.delete(expenseId);
  }
}
