import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DeviceInfoDto } from '../../../common/dto/device-info.dto';
import { ProfileResponse } from '../../user-accounts/dto/profile.dto';

/** Every sign-in may say which phone / browser it comes from (listed in Profile > Devices). */
class SignInDeviceDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

export class GoogleSignInDto extends SignInDeviceDto {
  /** ID token returned by Google Sign-In on the device. */
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class DeveloperSignInDto extends SignInDeviceDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;
}

export class PasswordSignInDto extends SignInDeviceDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your password.' })
  @MaxLength(72)
  password: string;
}

export class TwoFactorSignInDto extends SignInDeviceDto {
  /** `twoFactorToken` returned by the first sign-in step (valid for 5 minutes). */
  @IsString()
  @IsNotEmpty()
  twoFactorToken: string;

  /** 6-digit code from the authenticator app, or a backup code (XXXX-XXXX). */
  @IsString()
  @MinLength(6, { message: 'Enter the 6-digit code from your authenticator app.' })
  @MaxLength(20, { message: 'Enter the 6-digit code from your authenticator app.' })
  code: string;
}

export class UpdateProfileDto {
  /** Complete name, e.g. "Leo Isidro Dumangas". Saved in uppercase. */
  @IsString()
  @MinLength(3, { message: 'Please enter your complete name.' })
  @MaxLength(150)
  fullName: string;
}

/**
 * Result of a sign-in step.
 * - Signed in: `accessToken` and `profile` are set, `requiresTwoFactor` is false.
 * - Two-step verification is on: `requiresTwoFactor` is true and only `twoFactorToken` is set;
 *   send it with the code to POST /auth/two-factor to finish signing in.
 */
export class AuthSessionResponse {
  requiresTwoFactor: boolean;
  twoFactorToken: string | null;
  accessToken: string | null;
  profile: ProfileResponse | null;
}

export class AuthConfigResponse {
  googleWebClientId: string | null;
  isDevSignInEnabled: boolean;
  isPasswordSignInEnabled: boolean;
}
