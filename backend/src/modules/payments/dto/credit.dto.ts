import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  DATE_ONLY_MESSAGE,
  DATE_ONLY_PATTERN,
  DateRangeSearchQueryDto,
} from '../../../common/dto/common-query.dto';
import { PaymentMode, PaymentStatus } from '../../../common/enums/domain.enums';

/** Search credits (utang) by customer name and the date the order was made. */
export class CreditQueryDto extends DateRangeSearchQueryDto {
  /** Defaults to Unpaid. */
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class SettleCreditsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one unpaid order.' })
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  customerOrderIds: number[];

  @IsEnum(PaymentMode, { message: 'Choose how the customer paid.' })
  paymentMode: PaymentMode;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  /** Date of payment (YYYY-MM-DD). Defaults to today. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: `paidOn ${DATE_ONLY_MESSAGE}` })
  paidOn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}

export class CreditItemResponse {
  customerOrderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  contactNumber: string;
  orderedAt: Date;
  deliveredAt: Date | null;
  gallonsOrdered: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode | null;
  /** Reference number submitted by the customer or recorded at payment. */
  paymentReference: string | null;
  paidAt: Date | null;
  handledByName: string | null;
}

export class CreditListResponse {
  items: CreditItemResponse[];
  totalCount: number;
  totalAmount: number;
}

export class SettleCreditsResponse {
  settledCount: number;
  totalAmountPaid: number;
  paidAt: Date;
}
