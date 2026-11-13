import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, STAFF_ROLES, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireEmployeeId, requireWaterStationId } from '../../common/utils/user-scope.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import {
  EmployeeResponse,
  InviteEmployeeDto,
  UpdateEmployeeDto,
  UpdateLocationDto,
} from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(...STAFF_ROLES)
  @Patch('me/location')
  updateMyLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() locationDto: UpdateLocationDto,
  ): Promise<{ updatedAt: Date }> {
    return this.employeesService.updateLocation(requireEmployeeId(user), locationDto);
  }

  @Roles(UserRole.Admin)
  @Get()
  listEmployees(@CurrentUser() user: AuthenticatedUser): Promise<EmployeeResponse[]> {
    return this.employeesService.listEmployees(requireWaterStationId(user));
  }

  @Roles(UserRole.Admin)
  @Post()
  @RecordActivity<EmployeeResponse>({
    type: ActivityType.EmployeeInvited,
    describe: ({ result }) => `Invited the employee ${result.fullName}`,
  })
  inviteEmployee(
    @CurrentUser() user: AuthenticatedUser,
    @Body() inviteDto: InviteEmployeeDto,
  ): Promise<EmployeeResponse> {
    return this.employeesService.inviteEmployee(requireWaterStationId(user), inviteDto);
  }

  @Roles(UserRole.Admin)
  @Patch(':employeeId')
  @RecordActivity<EmployeeResponse>({
    type: ActivityType.EmployeeUpdated,
    describe: ({ result }) => `Updated the employee ${result.fullName}`,
  })
  updateEmployee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() updateDto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    return this.employeesService.updateEmployee(requireWaterStationId(user), employeeId, updateDto);
  }
}
