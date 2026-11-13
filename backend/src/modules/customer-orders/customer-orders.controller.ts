import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { DateRangeSearchQueryDto } from '../../common/dto/common-query.dto';
import { ActivityType, STAFF_ROLES, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { formatPeso, pluralize } from '../../common/utils/text.util';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { GallonLedgerService, StationRecordRow } from '../gallon-contracts/gallon-ledger.service';
import { CustomerOrdersService } from './customer-orders.service';
import {
  CancelOrderDto,
  CreateCustomerOrderDto,
  CustomerOrderQueryDto,
  CustomerOrderResponse,
  DeliverOrderDto,
  OrderReasonDto,
  PendingOrderCountResponse,
  StaffOrderQueryDto,
  SubmitPaymentReferenceDto,
} from './dto/customer-order.dto';
import { OrderWorkflowService } from './order-workflow.service';

/** " of JUAN DELA CRUZ" for the activity log (empty when the response has no customer). */
const describeOrderCustomer = (order: CustomerOrderResponse): string =>
  order.customer ? ` of ${order.customer.fullName}` : '';

@ApiTags('Customer Orders')
@ApiBearerAuth()
@Controller('customer-orders')
export class CustomerOrdersController {
  constructor(
    private readonly customerOrdersService: CustomerOrdersService,
    private readonly orderWorkflowService: OrderWorkflowService,
    private readonly gallonLedgerService: GallonLedgerService,
  ) {}

  // ----- Customer -----

  @Roles(UserRole.Customer)
  @Post()
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.OrderPlaced,
    describe: ({ result }) =>
      `Placed order ${result.orderNumber} for ${pluralize(result.gallonsOrdered, 'gallon')} (${formatPeso(result.totalAmount)})`,
  })
  placeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreateCustomerOrderDto,
  ): Promise<CustomerOrderResponse> {
    return this.customerOrdersService.placeOrder(user, createDto);
  }

  @Roles(UserRole.Customer)
  @Get('mine')
  listMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CustomerOrderQueryDto,
  ): Promise<CustomerOrderResponse[]> {
    return this.customerOrdersService.listCustomerOrders(user, query);
  }

  // ----- Staff (static routes first, before ":customerOrderId") -----

  @Roles(...STAFF_ROLES)
  @Get()
  listStationOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StaffOrderQueryDto,
  ): Promise<CustomerOrderResponse[]> {
    return this.customerOrdersService.listStationOrders(user, query);
  }

  @Roles(...STAFF_ROLES)
  @Get('pending-count')
  getPendingCounts(@CurrentUser() user: AuthenticatedUser): Promise<PendingOrderCountResponse> {
    return this.customerOrdersService.getPendingCounts(user);
  }

  /** Records grid: Name | Gallons Ordered | Returned | Remaining | Cash/Credit | Mode of payment. */
  @Roles(...STAFF_ROLES)
  @Get('records')
  getRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DateRangeSearchQueryDto,
  ): Promise<StationRecordRow[]> {
    return this.gallonLedgerService.getStationRecords(requireWaterStationId(user), query);
  }

  // ----- Single order -----

  @Get(':customerOrderId')
  getOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
  ): Promise<CustomerOrderResponse> {
    return this.customerOrdersService.getOrderForUser(user, customerOrderId);
  }

  @Roles(UserRole.Customer)
  @Patch(':customerOrderId/cancel')
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.OrderCancelled,
    describe: ({ result }) => `Cancelled order ${result.orderNumber}`,
  })
  cancelOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
    @Body() cancelDto: CancelOrderDto,
  ): Promise<CustomerOrderResponse> {
    return this.orderWorkflowService.cancelOrder(user, customerOrderId, cancelDto);
  }

  @Roles(UserRole.Customer)
  @Patch(':customerOrderId/payment-reference')
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.PaymentReferenceSent,
    describe: ({ result }) => `Sent the payment reference number for order ${result.orderNumber}`,
  })
  submitPaymentReference(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
    @Body() referenceDto: SubmitPaymentReferenceDto,
  ): Promise<CustomerOrderResponse> {
    return this.customerOrdersService.submitPaymentReference(user, customerOrderId, referenceDto);
  }

  @Roles(...STAFF_ROLES)
  @Patch(':customerOrderId/accept')
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.OrderAccepted,
    describe: ({ result }) => `Accepted order ${result.orderNumber}${describeOrderCustomer(result)}`,
  })
  acceptOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
  ): Promise<CustomerOrderResponse> {
    return this.orderWorkflowService.acceptOrder(user, customerOrderId);
  }

  @Roles(...STAFF_ROLES)
  @Patch(':customerOrderId/decline')
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.OrderDeclined,
    describe: ({ result }) => `Declined order ${result.orderNumber}${describeOrderCustomer(result)}`,
  })
  declineOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
    @Body() reasonDto: OrderReasonDto,
  ): Promise<CustomerOrderResponse> {
    return this.orderWorkflowService.declineOrder(user, customerOrderId, reasonDto);
  }

  @Roles(...STAFF_ROLES)
  @Patch(':customerOrderId/deliver')
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.OrderDelivered,
    describe: ({ result }) =>
      `Delivered order ${result.orderNumber}${describeOrderCustomer(result)}: ` +
      `${pluralize(result.gallonsOrdered, 'gallon')}, ${formatPeso(result.totalAmount)}`,
  })
  deliverOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
    @Body() deliverDto: DeliverOrderDto,
  ): Promise<CustomerOrderResponse> {
    return this.orderWorkflowService.deliverOrder(user, customerOrderId, deliverDto);
  }

  @Roles(...STAFF_ROLES)
  @Patch(':customerOrderId/fail')
  @RecordActivity<CustomerOrderResponse>({
    type: ActivityType.OrderFailed,
    describe: ({ result }) =>
      `Marked order ${result.orderNumber}${describeOrderCustomer(result)} as not delivered`,
  })
  failOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerOrderId', ParseIntPipe) customerOrderId: number,
    @Body() reasonDto: OrderReasonDto,
  ): Promise<CustomerOrderResponse> {
    return this.orderWorkflowService.failOrder(user, customerOrderId, reasonDto);
  }
}
