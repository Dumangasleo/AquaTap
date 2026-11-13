import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentDateTime, toDateOnlyString } from '../../common/utils/date-time.util';
import { requireEmployeeId, requireWaterStationId } from '../../common/utils/user-scope.util';
import { TransactionSummaryCalculator } from '../reports/transaction-summary.calculator';
import { ActiveShiftResponse, EmployeeShiftResponse, TimeOutDto } from './dto/employee-shift.dto';
import { EmployeeShift } from './employee-shift.entity';
import { toEmployeeShiftResponse } from './employee-shift.mapper';

@Injectable()
export class EmployeeShiftsService {
  constructor(
    @InjectRepository(EmployeeShift) private readonly employeeShiftRepository: Repository<EmployeeShift>,
    private readonly transactionSummaryCalculator: TransactionSummaryCalculator,
  ) {}

  async getActiveShift(user: AuthenticatedUser): Promise<ActiveShiftResponse> {
    const shift = await this.findOpenShift(requireEmployeeId(user));
    return { activeShift: shift ? toEmployeeShiftResponse(shift) : null };
  }

  async timeIn(user: AuthenticatedUser): Promise<EmployeeShiftResponse> {
    const employeeId = requireEmployeeId(user);
    const openShift = await this.findOpenShift(employeeId);
    if (openShift) {
      throw new ConflictException(
        `You are already timed in since ${openShift.timeIn.toLocaleString('en-PH')}. Please time out first.`,
      );
    }

    const timeIn = currentDateTime();
    const shift = await this.employeeShiftRepository.save(
      this.employeeShiftRepository.create({
        employeeId,
        waterStationId: requireWaterStationId(user),
        shiftDate: toDateOnlyString(timeIn),
        timeIn,
        timeOut: null,
      }),
    );
    return toEmployeeShiftResponse((await this.findShiftWithEmployee(shift.employeeShiftId))!);
  }

  /** Closes the shift and saves the totals of everything the employee did between time in and time out. */
  async timeOut(user: AuthenticatedUser, timeOutDto: TimeOutDto): Promise<EmployeeShiftResponse> {
    const employeeId = requireEmployeeId(user);
    const openShift = await this.findOpenShift(employeeId);
    if (!openShift) throw new BadRequestException('You are not timed in.');

    const timeOut = currentDateTime();
    const summary = await this.transactionSummaryCalculator.calculate({
      waterStationId: openShift.waterStationId,
      employeeId,
      employeeShiftId: openShift.employeeShiftId,
      periodStart: openShift.timeIn,
      periodEnd: timeOut,
    });

    await this.employeeShiftRepository.update(openShift.employeeShiftId, {
      timeOut,
      totalDeliveredOrders: summary.deliveredOrders,
      totalGallonsDelivered: summary.gallonsDelivered,
      totalGallonsReturned: summary.gallonsReturned,
      totalCashSales: summary.cashSales,
      totalCreditSales: summary.creditSales,
      totalCollections: summary.collections,
      totalExpenses: summary.totalExpenses,
      netCashOnHand: summary.cashOnHand,
      remarks: timeOutDto.remarks?.trim() || null,
    });

    return toEmployeeShiftResponse((await this.findShiftWithEmployee(openShift.employeeShiftId))!);
  }

  private findOpenShift(employeeId: number): Promise<EmployeeShift | null> {
    return this.employeeShiftRepository.findOne({
      where: { employeeId, timeOut: IsNull() },
      relations: { employee: true },
      order: { timeIn: 'DESC' },
    });
  }

  private findShiftWithEmployee(employeeShiftId: number): Promise<EmployeeShift | null> {
    return this.employeeShiftRepository.findOne({
      where: { employeeShiftId },
      relations: { employee: true },
    });
  }
}
