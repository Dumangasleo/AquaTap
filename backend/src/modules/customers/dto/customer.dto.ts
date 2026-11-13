import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import { GallonBalance } from '../../gallon-contracts/gallon-ledger.service';

export class RegisterCustomerDto {
  /** The water refilling station the customer will order from. */
  @Type(() => Number)
  @IsInt()
  waterStationId: number;

  @IsString()
  @MinLength(3, { message: 'Please enter your complete name.' })
  @MaxLength(150)
  fullName: string;

  @IsString()
  @MinLength(5, { message: 'Please enter your complete address.' })
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsString()
  @MinLength(7, { message: 'Please enter a valid contact number.' })
  @MaxLength(30)
  contactNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  /** Number of gallon containers borrowed from the station. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  borrowedGallons: number;

  /** Signature drawn on the phone, saved as SVG markup. */
  @IsString()
  @Matches(/^<svg[\s\S]*<\/svg>$/, { message: 'Please sign the agreement.' })
  @MaxLength(500_000)
  signatureSvg: string;

  /** false = save only the details and signature, without the contract text. */
  @IsBoolean()
  useContractTemplate: boolean;
}

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(30)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

export class CustomerListItemResponse {
  customerId: number;
  fullName: string;
  address: string;
  contactNumber: string;
  landmark: string | null;
  createdAt: Date;
  remainingGallons: number;
  unpaidBalance: number;
  lastOrderAt: Date | null;
}

export class GallonContractResponse {
  gallonContractId: number;
  fullName: string;
  address: string;
  occupation: string | null;
  contactNumber: string;
  borrowedGallons: number;
  contractBody: string | null;
  signatureSvg: string;
  signedAt: Date;
}

export class CustomerCreditSummary {
  unpaidBalance: number;
  unpaidOrderCount: number;
  totalPaid: number;
}

export class CustomerAccountResponse {
  customerId: number;
  waterStationId: number;
  stationName: string;
  email: string | null;
  fullName: string;
  address: string;
  occupation: string | null;
  contactNumber: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  contract: GallonContractResponse | null;
  gallonBalance: GallonBalance;
  credit: CustomerCreditSummary;
  totalOrders: number;
  activeOrders: number;
}
