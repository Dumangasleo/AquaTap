import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrder } from '../customer-orders/customer-order.entity';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { Expense } from '../expenses/expense.entity';
import { BusinessSummaryService } from './business-summary.service';
import { DailyReportService } from './daily-report.service';
import { ReportsController } from './reports.controller';
import { TransactionSummaryCalculator } from './transaction-summary.calculator';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrder, Expense, EmployeeShift])],
  controllers: [ReportsController],
  providers: [DailyReportService, BusinessSummaryService, TransactionSummaryCalculator],
  exports: [TransactionSummaryCalculator],
})
export class ReportsModule {}
