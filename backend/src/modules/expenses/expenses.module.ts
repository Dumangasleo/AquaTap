import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { Expense } from './expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, EmployeeShift])],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
