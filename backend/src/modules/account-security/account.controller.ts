import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { ActivityType } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { normalizeIpAddress } from '../../common/utils/request.util';
import { pluralize } from '../../common/utils/text.util';
import { AccountActivityService } from '../account-activity/account-activity.service';
import {
  AccountActivityListResponse,
  AccountActivityQueryDto,
} from '../account-activity/dto/account-activity.dto';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { ProfileResponse } from '../user-accounts/dto/profile.dto';
import { ProfileService } from '../user-accounts/profile.service';
import { AvatarService } from './avatar/avatar.service';
import {
  ChangePasswordDto,
  RecoveryCodesResponse,
  SessionResponse,
  SignOutOtherDevicesResponse,
  TwoFactorCodeDto,
  TwoFactorSetupResponse,
  UpdateAvatarDto,
} from './dto/account-security.dto';
import { PasswordService } from './password/password.service';
import { UserSessionsService } from './sessions/user-sessions.service';
import { TwoFactorService } from './two-factor/two-factor.service';

/** Profile screen of every signed-in user: photo, password, two-step verification, devices, activity. */
@ApiTags('Account (profile & security)')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(
    private readonly avatarService: AvatarService,
    private readonly passwordService: PasswordService,
    private readonly twoFactorService: TwoFactorService,
    private readonly userSessionsService: UserSessionsService,
    private readonly accountActivityService: AccountActivityService,
    private readonly profileService: ProfileService,
  ) {}

  // ----- Profile photo -----

  @Put('avatar')
  @RecordActivity({ type: ActivityType.AvatarChanged, describe: () => 'Changed profile photo' })
  async changeAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() avatarDto: UpdateAvatarDto,
  ): Promise<ProfileResponse> {
    await this.avatarService.changeAvatar(user.userAccountId, avatarDto.imageDataUri);
    return this.profileService.getProfile(user.userAccountId, user.userSessionId);
  }

  @Delete('avatar')
  @RecordActivity({ type: ActivityType.AvatarRemoved, describe: () => 'Removed profile photo' })
  async removeAvatar(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponse> {
    await this.avatarService.removeAvatar(user.userAccountId);
    return this.profileService.getProfile(user.userAccountId, user.userSessionId);
  }

  // ----- Password -----

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changeDto: ChangePasswordDto,
    @Ip() ipAddress: string,
  ): Promise<void> {
    const { hadPassword, signedOutDeviceCount } = await this.passwordService.changePassword(user, changeDto);

    const otherDevicesNote =
      signedOutDeviceCount > 0 ? ` and signed out ${pluralize(signedOutDeviceCount, 'other device')}` : '';
    await this.accountActivityService.recordForUser(
      user,
      normalizeIpAddress(ipAddress),
      hadPassword ? ActivityType.PasswordChanged : ActivityType.PasswordSet,
      `${hadPassword ? 'Changed password' : 'Set a password'}${otherDevicesNote}`,
    );
  }

  // ----- Two-step verification -----

  @Post('two-factor/setup')
  @HttpCode(HttpStatus.OK)
  beginTwoFactorSetup(@CurrentUser() user: AuthenticatedUser): Promise<TwoFactorSetupResponse> {
    return this.twoFactorService.beginSetup(user.userAccountId);
  }

  @Post('two-factor/enable')
  @HttpCode(HttpStatus.OK)
  @RecordActivity({ type: ActivityType.TwoFactorEnabled, describe: () => 'Turned on two-step verification' })
  enableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() codeDto: TwoFactorCodeDto,
  ): Promise<RecoveryCodesResponse> {
    return this.twoFactorService.enable(user.userAccountId, codeDto.code);
  }

  @Post('two-factor/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RecordActivity({
    type: ActivityType.TwoFactorDisabled,
    describe: () => 'Turned off two-step verification',
  })
  disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() codeDto: TwoFactorCodeDto): Promise<void> {
    return this.twoFactorService.disable(user.userAccountId, codeDto.code);
  }

  @Post('two-factor/recovery-codes')
  @HttpCode(HttpStatus.OK)
  @RecordActivity({ type: ActivityType.RecoveryCodesRegenerated, describe: () => 'Created new backup codes' })
  regenerateRecoveryCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() codeDto: TwoFactorCodeDto,
  ): Promise<RecoveryCodesResponse> {
    return this.twoFactorService.regenerateRecoveryCodes(user.userAccountId, codeDto.code);
  }

  // ----- Devices -----

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser): Promise<SessionResponse[]> {
    return this.userSessionsService.listActiveSessions(user.userAccountId, user.userSessionId);
  }

  // Declared before "sessions/:userSessionId" so "sign-out-others" is not read as an ID.
  @Post('sessions/sign-out-others')
  @HttpCode(HttpStatus.OK)
  @RecordActivity<SignOutOtherDevicesResponse>({
    type: ActivityType.OtherDevicesSignedOut,
    describe: ({ result }) => `Signed out ${pluralize(result.signedOutCount, 'other device')}`,
  })
  async signOutOtherDevices(@CurrentUser() user: AuthenticatedUser): Promise<SignOutOtherDevicesResponse> {
    const signedOutCount = await this.userSessionsService.endOtherSessions(
      user.userAccountId,
      user.userSessionId,
    );
    return { signedOutCount };
  }

  @Delete('sessions/:userSessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOutDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userSessionId', ParseIntPipe) userSessionId: number,
    @Ip() ipAddress: string,
  ): Promise<void> {
    const endedSession = await this.userSessionsService.endSession(user.userAccountId, userSessionId);
    await this.accountActivityService.recordForUser(
      user,
      normalizeIpAddress(ipAddress),
      ActivityType.DeviceSignedOut,
      `Signed out the device ${endedSession.deviceName}`,
    );
  }

  // ----- Activity -----

  @Get('activity')
  listActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AccountActivityQueryDto,
  ): Promise<AccountActivityListResponse> {
    return this.accountActivityService.listActivity(user.userAccountId, query);
  }
}
