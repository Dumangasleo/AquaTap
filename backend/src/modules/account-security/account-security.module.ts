import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountActivityModule } from '../account-activity/account-activity.module';
import { UserAccount } from '../user-accounts/user-account.entity';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { AccountController } from './account.controller';
import { AvatarService } from './avatar/avatar.service';
import { SecretCipherService } from './crypto/secret-cipher.service';
import { PasswordHasher } from './password/password-hasher';
import { PasswordService } from './password/password.service';
import { UserSession } from './sessions/user-session.entity';
import { UserSessionsService } from './sessions/user-sessions.service';
import { SignInLockoutService } from './sign-in-lockout.service';
import { TotpService } from './two-factor/totp.service';
import { TwoFactorRecoveryCode } from './two-factor/two-factor-recovery-code.entity';
import { TwoFactorService } from './two-factor/two-factor.service';

/**
 * Account security: device sessions, password, two-step verification and the profile photo.
 * AuthModule uses the exported services to sign users in; AccountController serves the Profile screen.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserAccount, UserSession, TwoFactorRecoveryCode]),
    UserAccountsModule,
    AccountActivityModule,
  ],
  controllers: [AccountController],
  providers: [
    UserSessionsService,
    SignInLockoutService,
    PasswordHasher,
    PasswordService,
    TotpService,
    SecretCipherService,
    TwoFactorService,
    AvatarService,
  ],
  exports: [UserSessionsService, SignInLockoutService, PasswordHasher, TwoFactorService],
})
export class AccountSecurityModule {}
