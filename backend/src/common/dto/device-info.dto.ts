import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform, REPORTED_DEVICE_PLATFORMS } from '../enums/domain.enums';

/** The phone / browser that signs in. Shown in Profile > Devices so the user recognises it. */
export class DeviceInfoDto {
  /** e.g. "Samsung SM-A546E" or "Chrome on Windows". */
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  deviceName: string;

  @IsIn(REPORTED_DEVICE_PLATFORMS, { message: 'platform must be Android, iOS or Web.' })
  platform: DevicePlatform;

  /** App version, e.g. "1.0.0". */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;
}
