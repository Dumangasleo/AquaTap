import { EmployeeShiftResponse } from './dto/employee-shift.dto';
import { EmployeeShift } from './employee-shift.entity';

export function toEmployeeShiftResponse(shift: EmployeeShift): EmployeeShiftResponse {
  return {
    employeeShiftId: shift.employeeShiftId,
    employeeId: shift.employeeId,
    employeeName: shift.employee?.fullName ?? null,
    shiftDate: shift.shiftDate,
    timeIn: shift.timeIn,
    timeOut: shift.timeOut,
    isOpen: shift.timeOut === null,
    totalDeliveredOrders: shift.totalDeliveredOrders,
    totalGallonsDelivered: shift.totalGallonsDelivered,
    totalGallonsReturned: shift.totalGallonsReturned,
    totalCashSales: shift.totalCashSales,
    totalCreditSales: shift.totalCreditSales,
    totalCollections: shift.totalCollections,
    totalExpenses: shift.totalExpenses,
    netCashOnHand: shift.netCashOnHand,
    remarks: shift.remarks,
  };
}
