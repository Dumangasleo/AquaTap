import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignInMethod } from '../../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { currentDateTime } from '../../../common/utils/date-time.util';
import { UserAccount } from '../../user-accounts/user-account.entity';
import { UserAccountsService } from '../../user-accounts/user-accounts.service';
import { ChangePasswordDto } from '../dto/account-security.dto';
import { UserSessionsService } from '../sessions/user-sessions.service';
import { PasswordHasher } from './password-hasher';

export interface PasswordChangeResult {
  /** false = the account had no password before (it was just "set" for the first time). */
  hadPassword: boolean;
  /** Other devices that were signed out because the password changed. */
  signedOutDeviceCount: number;
}

/** Setting and changing the account password (sign-in with a password is orchestrated by AuthService). */
@Injectable()
export class PasswordService {
  constructor(
    @InjectRepository(UserAccount) private readonly userAccountRepository: Repository<UserAccount>,
    private readonly userAccountsService: UserAccountsService,
    private readonly userSessionsService: UserSessionsService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  /**
   * Sets the first password or replaces the current one, then signs out every other device.
   * The current password is asked unless this device signed in with Google
   * (Google already proved who the user is - this is how a forgotten password is replaced).
   */
  async changePassword(user: AuthenticatedUser, changeDto: ChangePasswordDto): Promise<PasswordChangeResult> {
    const account = await this.userAccountsService.findWithCredentials({ userAccountId: user.userAccountId });
    const session = await this.userSessionsService.findActiveSession(user.userAccountId, user.userSessionId);
    if (!account || !session) throw new UnauthorizedException('Please sign in again.');

    const currentPasswordHash = account.passwordHash ?? null;
    const signedInWithGoogle = session.signInMethod === SignInMethod.Google;

    if (currentPasswordHash && !signedInWithGoogle) {
      if (!changeDto.currentPassword) {
        throw new BadRequestException('Enter your current password.');
      }
      if (!(await this.passwordHasher.verify(changeDto.currentPassword, currentPasswordHash))) {
        throw new BadRequestException('Your current password is not correct.');
      }
    }
    if (
      currentPasswordHash &&
      (await this.passwordHasher.verify(changeDto.newPassword, currentPasswordHash))
    ) {
      throw new BadRequestException('Choose a new password that is different from your current one.');
    }

    await this.userAccountRepository.update(user.userAccountId, {
      passwordHash: await this.passwordHasher.hash(changeDto.newPassword),
      passwordChangedAt: currentDateTime(),
      failedSignInCount: 0,
      signInLockedUntil: null,
    });

    const signedOutDeviceCount = await this.userSessionsService.endOtherSessions(
      user.userAccountId,
      user.userSessionId,
    );
    return { hadPassword: currentPasswordHash !== null, signedOutDeviceCount };
  }
}
