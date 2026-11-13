import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';
import { ActivityType } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { normalizeIpAddress } from '../../common/utils/request.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { ProfileResponse } from '../user-accounts/dto/profile.dto';
import { AuthService } from './auth.service';
import {
  AuthConfigResponse,
  AuthSessionResponse,
  DeveloperSignInDto,
  GoogleSignInDto,
  PasswordSignInDto,
  TwoFactorSignInDto,
  UpdateProfileDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('config')
  getConfig(): AuthConfigResponse {
    return this.authService.getPublicConfig();
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  signInWithGoogle(
    @Body() signInDto: GoogleSignInDto,
    @Ip() ipAddress: string,
  ): Promise<AuthSessionResponse> {
    return this.authService.signInWithGoogle(signInDto, normalizeIpAddress(ipAddress));
  }

  @Public()
  @Post('dev-sign-in')
  @HttpCode(HttpStatus.OK)
  signInAsDeveloper(
    @Body() signInDto: DeveloperSignInDto,
    @Ip() ipAddress: string,
  ): Promise<AuthSessionResponse> {
    return this.authService.signInAsDeveloper(signInDto, normalizeIpAddress(ipAddress));
  }

  /** Rate limited per IP address (AUTH_RATE_LIMIT_PER_MINUTE) to slow down password guessing. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('password')
  @HttpCode(HttpStatus.OK)
  signInWithPassword(
    @Body() signInDto: PasswordSignInDto,
    @Ip() ipAddress: string,
  ): Promise<AuthSessionResponse> {
    return this.authService.signInWithPassword(signInDto, normalizeIpAddress(ipAddress));
  }

  /** Second step when two-step verification is on. Rate limited like the password sign-in. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('two-factor')
  @HttpCode(HttpStatus.OK)
  completeTwoFactorSignIn(
    @Body() signInDto: TwoFactorSignInDto,
    @Ip() ipAddress: string,
  ): Promise<AuthSessionResponse> {
    return this.authService.completeTwoFactorSignIn(signInDto, normalizeIpAddress(ipAddress));
  }

  /** Ends the session of this device; its access token stops working. */
  @ApiBearerAuth()
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RecordActivity({
    type: ActivityType.SignedOut,
    describe: ({ user }) => `Signed out on ${user.deviceName}`,
  })
  signOut(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.authService.signOut(user);
  }

  @ApiBearerAuth()
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponse> {
    return this.authService.getProfile(user);
  }

  @ApiBearerAuth()
  @Patch('me')
  @RecordActivity<ProfileResponse>({
    type: ActivityType.ProfileUpdated,
    describe: ({ result }) => `Changed name to ${result.fullName ?? ''}`.trim(),
  })
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.authService.updateFullName(user, updateProfileDto.fullName);
  }
}
