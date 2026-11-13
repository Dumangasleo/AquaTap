import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform, SignInMethod } from '../../../common/enums/domain.enums';

// ----- Profile photo -----

export const MAX_AVATAR_DATA_URI_LENGTH = 6_000_000;
export const AVATAR_DATA_URI_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/;

export class UpdateAvatarDto {
  /** The photo as a data URI (PNG, JPG or WEBP). The API crops and shrinks it to 256 x 256. */
  @IsString()
  @MaxLength(MAX_AVATAR_DATA_URI_LENGTH, {
    message: 'The photo is too big. Please choose a photo below 4 MB.',
  })
  @Matches(AVATAR_DATA_URI_PATTERN, { message: 'Choose a photo (JPG, PNG or WEBP).' })
  imageDataUri: string;
}

// ----- Password -----

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export class ChangePasswordDto {
  /**
   * Required when the account already has a password, except right after signing in with Google
   * (that is how a forgotten password is replaced).
   */
  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword?: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'Your new password must have at least 8 characters.' })
  @MaxLength(PASSWORD_MAX_LENGTH, { message: 'Your new password must have at most 72 characters.' })
  @Matches(/[A-Za-z]/, { message: 'Your new password must have at least one letter.' })
  @Matches(/\d/, { message: 'Your new password must have at least one number.' })
  newPassword: string;
}

// ----- Two-step verification (2FA) -----

export class TwoFactorCodeDto {
  /** 6-digit code from the authenticator app, or a backup code (XXXX-XXXX) where allowed. */
  @IsString()
  @MinLength(6, { message: 'Enter the 6-digit code from your authenticator app.' })
  @MaxLength(20, { message: 'Enter the 6-digit code from your authenticator app.' })
  code: string;
}

export class TwoFactorSetupResponse {
  /** Secret key (base32) to type into the authenticator app when the QR code cannot be scanned. */
  secretKey: string;
  /** otpauth:// link: opens the authenticator app on the same phone. */
  otpauthUrl: string;
  /** QR code (PNG data URI) of the otpauth link, to scan with another phone. */
  qrCodeDataUri: string;
}

export class RecoveryCodesResponse {
  /** Backup codes (XXXX-XXXX). Shown only once; each code works one time. */
  recoveryCodes: string[];
}

// ----- Devices (sessions) -----

export class SessionResponse {
  userSessionId: number;
  deviceName: string;
  platform: DevicePlatform;
  appVersion: string | null;
  ipAddress: string | null;
  signInMethod: SignInMethod;
  signedInAt: Date;
  lastActiveAt: Date;
  /** true = the device that is asking. */
  isCurrent: boolean;
}

export class SignOutOtherDevicesResponse {
  signedOutCount: number;
}
