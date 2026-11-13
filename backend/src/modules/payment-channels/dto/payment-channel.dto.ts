import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaymentChannelType } from '../../../common/enums/domain.enums';

/** Max ~3 MB data URI (PNG/JPEG of the GCash / bank QR code). */
const QR_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

export class CreatePaymentChannelDto {
  @IsEnum(PaymentChannelType, { message: 'Choose GCash or Bank Transfer.' })
  channelType: PaymentChannelType;

  /** e.g. "GCash", "BDO", "BPI", "Maya" */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  channelName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  accountName: string;

  @IsString()
  @MinLength(4)
  @MaxLength(60)
  accountNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(4_000_000)
  @Matches(QR_IMAGE_PATTERN, { message: 'The QR code must be a PNG or JPEG image.' })
  qrImage?: string;
}

export class UpdatePaymentChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  channelName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  accountName?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(60)
  accountNumber?: string;

  /** Send an empty string to remove the QR code. */
  @IsOptional()
  @IsString()
  @MaxLength(4_000_000)
  qrImage?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PaymentChannelResponse {
  paymentChannelId: number;
  channelType: PaymentChannelType;
  channelName: string;
  accountName: string;
  accountNumber: string;
  qrImage: string | null;
  isActive: boolean;
}
