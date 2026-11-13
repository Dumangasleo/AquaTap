import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, STAFF_ROLES } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { formatPeso, pluralize } from '../../common/utils/text.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { ActiveShiftResponse, EmployeeShiftResponse, TimeOutDto } from './dto/employee-shift.dto';
import { EmployeeShiftsService } from './employee-shifts.service';

/** Shifts of a day are listed inside the daily report (GET /reports/daily). */
@ApiTags('Employee Shifts')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('employee-shifts')
export class EmployeeShiftsController {
  constructor(private readonly employeeShiftsService: EmployeeShiftsService) {}

  @Get('active')
  getActiveShift(@CurrentUser() user: AuthenticatedUser): Promise<ActiveShiftResponse> {
    return this.employeeShiftsService.getActiveShift(user);
  }

  @Post('time-in')
  @RecordActivity({ type: ActivityType.ShiftStarted, describe: () => 'Timed in (started duty)' })
  timeIn(@CurrentUser() user: AuthenticatedUser): Promise<EmployeeShiftResponse> {
    return this.employeeShiftsService.timeIn(user);
  }

  @Post('time-out')
  @HttpCode(HttpStatus.OK)
  @RecordActivity<EmployeeShiftResponse>({
    type: ActivityType.ShiftEnded,
    describe: ({ result }) =>
      `Timed out: ${pluralize(result.totalDeliveredOrders, 'delivery', 'deliveries')}, ` +
      `cash on hand ${formatPeso(result.netCashOnHand)}`,
  })
  timeOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() timeOutDto: TimeOutDto,
  ): Promise<EmployeeShiftResponse> {
    return this.employeeShiftsService.timeOut(user, timeOutDto);
  }
}
