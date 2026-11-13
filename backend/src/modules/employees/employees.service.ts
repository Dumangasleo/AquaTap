import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/domain.enums';
import { normalizeEmail, normalizeFullName } from '../../common/utils/text.util';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { UserAccount } from '../user-accounts/user-account.entity';
import {
  EmployeeResponse,
  InviteEmployeeDto,
  UpdateEmployeeDto,
  UpdateLocationDto,
} from './dto/employee.dto';
import { Employee } from './employee.entity';
import { currentDateTime } from '../../common/utils/date-time.util';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeShift) private readonly employeeShiftRepository: Repository<EmployeeShift>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listEmployees(waterStationId: number): Promise<EmployeeResponse[]> {
    const [employees, openShifts] = await Promise.all([
      this.employeeRepository.find({
        where: { waterStationId },
        order: { isOwner: 'DESC', fullName: 'ASC' },
      }),
      this.employeeShiftRepository.find({ where: { waterStationId, timeOut: IsNull() } }),
    ]);
    const onDutyEmployeeIds = new Set(openShifts.map((shift) => shift.employeeId));
    return employees.map((employee) => this.toResponse(employee, onDutyEmployeeIds.has(employee.employeeId)));
  }

  /**
   * Admin adds an employee by Gmail address. The first time that Google account signs in,
   * it is linked automatically and opens the employee app.
   */
  async inviteEmployee(waterStationId: number, inviteDto: InviteEmployeeDto): Promise<EmployeeResponse> {
    const email = normalizeEmail(inviteDto.email);

    const existingEmployee = await this.employeeRepository.findOne({ where: { email } });
    if (existingEmployee) throw new ConflictException('This email is already registered as an employee.');

    const existingAccount = await this.dataSource.manager.findOne(UserAccount, { where: { email } });
    if (existingAccount?.userRole) {
      throw new ConflictException(
        `This email is already registered as ${existingAccount.userRole === UserRole.Customer ? 'a customer' : 'a station account'}.`,
      );
    }

    const employee = await this.dataSource.transaction(async (manager) => {
      const newEmployee = await manager.save(
        manager.create(Employee, {
          waterStationId,
          userAccountId: existingAccount?.userAccountId ?? null,
          fullName: normalizeFullName(inviteDto.fullName),
          email,
          contactNumber: inviteDto.contactNumber?.trim() || null,
          isOwner: false,
          isActive: true,
        }),
      );

      // The person already signed in once but has not chosen an account type yet: link now.
      if (existingAccount) {
        await manager.update(UserAccount, existingAccount.userAccountId, {
          userRole: UserRole.Employee,
          waterStationId,
          fullName: existingAccount.fullName ?? newEmployee.fullName,
        });
      }
      return newEmployee;
    });

    return this.toResponse(employee, false);
  }

  async updateEmployee(
    waterStationId: number,
    employeeId: number,
    updateDto: UpdateEmployeeDto,
  ): Promise<EmployeeResponse> {
    const employee = await this.employeeRepository.findOne({ where: { employeeId, waterStationId } });
    if (!employee) throw new NotFoundException('Employee not found.');

    if (updateDto.isActive === false && employee.isOwner) {
      throw new BadRequestException('The station owner cannot be deactivated.');
    }

    if (updateDto.fullName !== undefined) employee.fullName = normalizeFullName(updateDto.fullName);
    if (updateDto.contactNumber !== undefined)
      employee.contactNumber = updateDto.contactNumber.trim() || null;
    if (updateDto.isActive !== undefined) employee.isActive = updateDto.isActive;

    const savedEmployee = await this.employeeRepository.save(employee);
    const openShift = await this.employeeShiftRepository.findOne({
      where: { employeeId, timeOut: IsNull() },
    });
    return this.toResponse(savedEmployee, openShift !== null);
  }

  /** Rider location, shown to the customer while the order is on the way. */
  async updateLocation(employeeId: number, locationDto: UpdateLocationDto): Promise<{ updatedAt: Date }> {
    const updatedAt = currentDateTime();
    await this.employeeRepository.update(employeeId, {
      lastLatitude: locationDto.latitude,
      lastLongitude: locationDto.longitude,
      lastLocationAt: updatedAt,
    });
    return { updatedAt };
  }

  private toResponse(employee: Employee, isOnDuty: boolean): EmployeeResponse {
    return {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      contactNumber: employee.contactNumber,
      isOwner: employee.isOwner,
      isActive: employee.isActive,
      hasSignedIn: employee.userAccountId !== null,
      isOnDuty,
      createdAt: employee.createdAt,
    };
  }
}
