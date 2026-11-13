import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsModule } from '../reports/reports.module';
import { EmployeeShift } from './employee-shift.entity';
import { EmployeeShiftsController } from './employee-shifts.controller';
import { EmployeeShiftsService } from './employee-shifts.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeShift]), ReportsModule],
  controllers: [EmployeeShiftsController],
  providers: [EmployeeShiftsService],
})
export class EmployeeShiftsModule {}
