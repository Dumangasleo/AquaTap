import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/** Every station-scoped query must go through these helpers so data never leaks between stations. */
export function requireWaterStationId(user: AuthenticatedUser): number {
  if (user.waterStationId === null) {
    throw new ForbiddenException('Your account is not linked to a water refilling station yet.');
  }
  return user.waterStationId;
}

export function requireCustomerId(user: AuthenticatedUser): number {
  if (user.customerId === null) {
    throw new ForbiddenException('Only registered customers can do this.');
  }
  return user.customerId;
}

export function requireEmployeeId(user: AuthenticatedUser): number {
  if (user.employeeId === null) {
    throw new ForbiddenException('Only station employees can do this.');
  }
  return user.employeeId;
}
