import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TimeOutDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class EmployeeShiftResponse {
  employeeShiftId: number;
  employeeId: number;
  employeeName: string | null;
  shiftDate: string;
  timeIn: Date;
  timeOut: Date | null;
  isOpen: boolean;
  totalDeliveredOrders: number;
  totalGallonsDelivered: number;
  totalGallonsReturned: number;
  totalCashSales: number;
  totalCreditSales: number;
  totalCollections: number;
  totalExpenses: number;
  netCashOnHand: number;
  remarks: string | null;
}

export class ActiveShiftResponse {
  activeShift: EmployeeShiftResponse | null;
}
