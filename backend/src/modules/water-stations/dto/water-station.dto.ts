import { StationVerificationStatus } from '../../../common/enums/domain.enums';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterWaterStationDto {
  /** Owner's complete name, e.g. "Leo Isidro Dumangas". */
  @IsString()
  @MinLength(3, { message: 'Please enter your complete name.' })
  @MaxLength(150)
  ownerFullName: string;

  @IsString()
  @MinLength(3, { message: 'Please enter the station name.' })
  @MaxLength(120)
  stationName: string;

  @IsString()
  @MinLength(5, { message: 'Please enter the complete station address.' })
  @MaxLength(255)
  address: string;

  @IsString()
  @MinLength(7, { message: 'Please enter a valid contact number.' })
  @MaxLength(30)
  contactNumber: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  pricePerGallon: number;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

export class UpdateWaterStationDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  stationName?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(30)
  contactNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  pricePerGallon?: number;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  /** Send an empty string to go back to the default template. */
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  contractTemplate?: string;
}

export class WaterStationResponse {
  waterStationId: number;
  stationName: string;
  address: string;
  contactNumber: string;
  pricePerGallon: number;
  latitude: number | null;
  longitude: number | null;
  contractTemplate: string;
  usesDefaultContractTemplate: boolean;
  verificationStatus: StationVerificationStatus;
  verificationRemarks: string | null;
}

export class WaterStationOptionResponse {
  waterStationId: number;
  stationName: string;
  address: string;
  contactNumber: string;
  pricePerGallon: number;
  latitude: number | null;
  longitude: number | null;
}

export class ContractTemplateResponse {
  waterStationId: number;
  stationName: string;
  contractTemplate: string;
}
