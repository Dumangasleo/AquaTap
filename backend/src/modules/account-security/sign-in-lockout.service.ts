import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { currentDateTime } from '../../common/utils/date-time.util';
import { pluralize } from '../../common/utils/text.util';
import { UserAccount } from '../user-accounts/user-account.entity';

export const MAX_FAILED_SIGN_IN_ATTEMPTS = 5;
export const SIGN_IN_LOCK_MINUTES = 15;

/**
 * Stops password / verification-code guessing: after 5 wrong tries in a row the account cannot
 * sign in with a password or a code for 15 minutes. A successful sign-in clears the counter
 * (UserAccountsService.recordSuccessfulSignIn).
 */
@Injectable()
export class SignInLockoutService {
  constructor(
    @InjectRepository(UserAccount) private readonly userAccountRepository: Repository<UserAccount>,
  ) {}

  /** Throws 429 (Too Many Requests) while the account is locked. */
  assertNotLocked(account: Pick<UserAccount, 'signInLockedUntil'>): void {
    const lockedUntil = account.signInLockedUntil;
    if (!lockedUntil || lockedUntil.getTime() <= Date.now()) return;

    const minutesLeft = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000));
    throw new HttpException(
      `Too many wrong attempts. Please try again in ${pluralize(minutesLeft, 'minute')}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /** Counts one wrong password / code and locks the account when the limit is reached. */
  async recordFailedAttempt(userAccountId: number): Promise<void> {
    // Incremented in the database so attempts arriving together are all counted.
    await this.userAccountRepository.increment({ userAccountId }, 'failedSignInCount', 1);

    const account = await this.userAccountRepository.findOne({
      where: { userAccountId },
      select: { userAccountId: true, failedSignInCount: true },
    });
    if (!account || account.failedSignInCount < MAX_FAILED_SIGN_IN_ATTEMPTS) return;

    await this.userAccountRepository.update(userAccountId, {
      failedSignInCount: 0,
      signInLockedUntil: new Date(currentDateTime().getTime() + SIGN_IN_LOCK_MINUTES * 60_000),
    });
  }
}
