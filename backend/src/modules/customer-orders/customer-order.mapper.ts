import { CustomerOrder } from './customer-order.entity';
import { CustomerOrderResponse } from './dto/customer-order.dto';

/** Converts a CustomerOrder entity (loaded with `customer` and `employee`) into the API response. */
export function toCustomerOrderResponse(
  order: CustomerOrder,
  viewerEmployeeId: number | null = null,
): CustomerOrderResponse {
  return {
    customerOrderId: order.customerOrderId,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    statusReason: order.statusReason,
    gallonsOrdered: order.gallonsOrdered,
    returnedGallons: order.returnedGallons,
    pricePerGallon: order.pricePerGallon,
    totalAmount: order.totalAmount,
    paymentType: order.paymentType,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    deliveryAddress: order.deliveryAddress,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    customerNotes: order.customerNotes,
    orderedAt: order.orderedAt,
    acceptedAt: order.acceptedAt,
    deliveredAt: order.deliveredAt,
    closedAt: order.closedAt,
    paidAt: order.paidAt,
    customer: order.customer
      ? {
          customerId: order.customer.customerId,
          fullName: order.customer.fullName,
          contactNumber: order.customer.contactNumber,
          address: order.customer.address,
          landmark: order.customer.landmark,
        }
      : null,
    handledBy: order.employee
      ? {
          employeeId: order.employee.employeeId,
          fullName: order.employee.fullName,
          contactNumber: order.employee.contactNumber,
          lastLatitude: order.employee.lastLatitude,
          lastLongitude: order.employee.lastLongitude,
          lastLocationAt: order.employee.lastLocationAt,
        }
      : null,
    isAssignedToMe: viewerEmployeeId !== null && order.employeeId === viewerEmployeeId,
  };
}
