import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DATE_ONLY_MESSAGE, DATE_ONLY_PATTERN, SearchQueryDto } from '../../../common/dto/common-query.dto';
import { OrderStatus, PaymentMode, PaymentStatus, PaymentType } from '../../../common/enums/domain.enums';

/** "Pending,Accepted" -> ['Pending', 'Accepted'] */
const toStatusList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean)
    : value;

export class CreateCustomerOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Order at least 1 gallon.' })
  @Max(100)
  gallonsOrdered: number;

  /** Empty containers the customer will hand over (the rider confirms the actual count on delivery). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  returnedGallons?: number;

  @IsEnum(PaymentType, { message: 'Choose Cash or Credit (utang).' })
  paymentType: PaymentType;

  /** Required for Cash orders. */
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  /** GCash / bank transfer reference number, if already paid. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  /** Defaults to the customer's saved address. */
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  deliveryAddress?: string;

  @IsOptional()
  @IsLatitude()
  deliveryLatitude?: number;

  @IsOptional()
  @IsLongitude()
  deliveryLongitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}

export class OrderReasonDto {
  @IsString()
  @MinLength(3, { message: 'Please give a short reason.' })
  @MaxLength(255)
  reason: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class DeliverOrderDto {
  /** Actual number of empty containers collected by the rider. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  returnedGallons: number;

  /** For Cash orders: how the customer paid. */
  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;
}

export class SubmitPaymentReferenceDto {
  @IsIn([PaymentMode.GCash, PaymentMode.BankTransfer], { message: 'Choose GCash or Bank Transfer.' })
  paymentMode: PaymentMode;

  @IsString()
  @MinLength(4, { message: 'Please enter the reference number.' })
  @MaxLength(100)
  paymentReference: string;
}

export class StaffOrderQueryDto extends SearchQueryDto {
  @IsOptional()
  @Transform(toStatusList)
  @IsEnum(OrderStatus, { each: true })
  statuses?: OrderStatus[];

  /** Only orders that were closed (or ordered, when still open) on this day. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: `date ${DATE_ONLY_MESSAGE}` })
  date?: string;
}

export class CustomerOrderQueryDto {
  @IsOptional()
  @Transform(toStatusList)
  @IsEnum(OrderStatus, { each: true })
  statuses?: OrderStatus[];

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class OrderCustomerResponse {
  customerId: number;
  fullName: string;
  contactNumber: string;
  address: string;
  landmark: string | null;
}

export class OrderHandlerResponse {
  employeeId: number;
  fullName: string;
  contactNumber: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAt: Date | null;
}

export class CustomerOrderResponse {
  customerOrderId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  statusReason: string | null;
  gallonsOrdered: number;
  returnedGallons: number;
  pricePerGallon: number;
  totalAmount: number;
  paymentType: PaymentType;
  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  customerNotes: string | null;
  orderedAt: Date;
  acceptedAt: Date | null;
  deliveredAt: Date | null;
  closedAt: Date | null;
  paidAt: Date | null;
  customer: OrderCustomerResponse | null;
  handledBy: OrderHandlerResponse | null;
  /** Staff only: true when the signed-in employee accepted this order. */
  isAssignedToMe: boolean;
}

export class PendingOrderCountResponse {
  pendingCount: number;
  myActiveCount: number;
}
