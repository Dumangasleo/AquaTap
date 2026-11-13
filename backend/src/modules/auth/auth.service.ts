import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DeviceInfoDto } from '../../common/dto/device-info.dto';
import { ActivityType, SignInMethod } from '../../common/enums/domain.enums';
import {
  AuthenticatedUser,
  JwtPayload,
  TWO_FACTOR_TOKEN_PURPOSE,
  TwoFactorTokenPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { AppConfig } from '../../config/app-config';
import { AccountActivityService } from '../account-activity/account-activity.service';
import { PasswordHasher } from '../account-security/password/password-hasher';
import { UserSessionsService } from '../account-security/sessions/user-sessions.service';
import { SignInLockoutService } from '../account-security/sign-in-lockout.service';
import { TwoFactorService } from '../account-security/two-factor/two-factor.service';
import { ProfileResponse } from '../user-accounts/dto/profile.dto';
import { ProfileService } from '../user-accounts/profile.service';
import { UserAccount } from '../user-accounts/user-account.entity';
import { UserAccountsService } from '../user-accounts/user-accounts.service';
import {
  AuthConfigResponse,
  AuthSessionResponse,
  DeveloperSignInDto,
  GoogleSignInDto,
  PasswordSignInDto,
  TwoFactorSignInDto,
} from './dto/auth.dto';
import { IdentityTokenVerifier } from './identity/identity-token-verifier';

const TWO_FACTOR_TOKEN_SECONDS = 5 * 60;
const UNKNOWN_DEVICE_NAME = 'Unknown device';
/** One message for "no such email", "no password yet" and "wrong password", so emails cannot be probed. */
const WRONG_CREDENTIALS_MESSAGE = 'Wrong email or password.';
const WRONG_CODE_MESSAGE = 'That code is not correct. Check your authenticator app and try again.';
const EXPIRED_TWO_FACTOR_MESSAGE = 'Your sign-in took too long. Please sign in again.';

/** Where a sign-in request comes from. */
export interface SignInOrigin {
  device: DeviceInfoDto | undefined;
  ipAddress: string | null;
}

/**
 * Orchestrates signing in: who the user is (Google / password / developer), the optional second step
 * (two-step verification), and starting the device session. The details live in their own services.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly identityTokenVerifier: IdentityTokenVerifier,
    private readonly userAccountsService: UserAccountsService,
    private readonly profileService: ProfileService,
    private readonly userSessionsService: UserSessionsService,
    private readonly signInLockoutService: SignInLockoutService,
    private readonly passwordHasher: PasswordHasher,
    private readonly twoFactorService: TwoFactorService,
    private readonly accountActivityService: AccountActivityService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  getPublicConfig(): AuthConfigResponse {
    return {
      googleWebClientId: this.configService.get('auth.googleWebClientId', { infer: true }),
      isDevSignInEnabled: this.configService.get('auth.isDevSignInEnabled', { infer: true }),
      isPasswordSignInEnabled: true,
    };
  }

  // ----- First sign-in step -----

  async signInWithGoogle(signInDto: GoogleSignInDto, ipAddress: string | null): Promise<AuthSessionResponse> {
    const identity = await this.identityTokenVerifier.verify(signInDto.idToken);
    const account = await this.userAccountsService.findOrCreateFromIdentity(identity);
    return this.completeFirstStep(account, SignInMethod.Google, { device: signInDto.device, ipAddress });
  }

  /** Email-only sign-in for local testing (AUTH_DEV_SIGN_IN_ENABLED=true). Never enable in production. */
  async signInAsDeveloper(
    signInDto: DeveloperSignInDto,
    ipAddress: string | null,
  ): Promise<AuthSessionResponse> {
    if (!this.configService.get('auth.isDevSignInEnabled', { infer: true })) {
      throw new NotFoundException('Developer sign-in is disabled.');
    }
    const account = await this.userAccountsService.findOrCreateFromIdentity({
      email: signInDto.email,
      googleSubject: null,
      fullName: signInDto.fullName ?? null,
      photoUrl: null,
    });
    return this.completeFirstStep(account, SignInMethod.Developer, { device: signInDto.device, ipAddress });
  }

  /** Email + password, for accounts that set a password in their profile. */
  async signInWithPassword(
    signInDto: PasswordSignInDto,
    ipAddress: string | null,
  ): Promise<AuthSessionResponse> {
    const origin: SignInOrigin = { device: signInDto.device, ipAddress };
    const account = await this.userAccountsService.findWithCredentials({ email: signInDto.email });

    if (!account?.isActive || !account.passwordHash) {
      await this.passwordHasher.simulateVerify(signInDto.password);
      throw new UnauthorizedException(WRONG_CREDENTIALS_MESSAGE);
    }
    this.signInLockoutService.assertNotLocked(account);

    if (!(await this.passwordHasher.verify(signInDto.password, account.passwordHash))) {
      await this.recordFailedSignIn(account, 'Someone entered a wrong password', origin);
      throw new UnauthorizedException(WRONG_CREDENTIALS_MESSAGE);
    }
    return this.completeFirstStep(account, SignInMethod.Password, origin);
  }

  // ----- Second sign-in step (two-step verification) -----

  async completeTwoFactorSignIn(
    signInDto: TwoFactorSignInDto,
    ipAddress: string | null,
  ): Promise<AuthSessionResponse> {
    const origin: SignInOrigin = { device: signInDto.device, ipAddress };
    const tokenPayload = await this.verifyTwoFactorToken(signInDto.twoFactorToken);

    const account = await this.userAccountsService.findWithCredentials({ userAccountId: tokenPayload.sub });
    if (!account?.isActive) throw new UnauthorizedException(EXPIRED_TWO_FACTOR_MESSAGE);
    this.signInLockoutService.assertNotLocked(account);

    if (!(await this.twoFactorService.verifySignInCode(account, signInDto.code))) {
      await this.recordFailedSignIn(account, 'Someone entered a wrong verification code', origin);
      throw new UnauthorizedException(WRONG_CODE_MESSAGE);
    }
    return this.startSession(account, tokenPayload.method, origin);
  }

  // ----- Signed-in user -----

  async signOut(user: AuthenticatedUser): Promise<void> {
    await this.userSessionsService.endSession(user.userAccountId, user.userSessionId);
  }

  getProfile(user: AuthenticatedUser): Promise<ProfileResponse> {
    return this.profileService.getProfile(user.userAccountId, user.userSessionId);
  }

  async updateFullName(user: AuthenticatedUser, fullName: string): Promise<ProfileResponse> {
    await this.userAccountsService.updateFullName(user.userAccountId, fullName);
    return this.getProfile(user);
  }

  // ----- Internals -----

  /** After the first step: ask for the code when two-step verification is on, otherwise sign in. */
  private async completeFirstStep(
    account: UserAccount,
    signInMethod: SignInMethod,
    origin: SignInOrigin,
  ): Promise<AuthSessionResponse> {
    if (account.isTwoFactorEnabled !== true) {
      return this.startSession(account, signInMethod, origin);
    }

    const tokenPayload: TwoFactorTokenPayload = {
      sub: account.userAccountId,
      purpose: TWO_FACTOR_TOKEN_PURPOSE,
      method: signInMethod,
    };
    const twoFactorToken = await this.jwtService.signAsync(tokenPayload, {
      expiresIn: TWO_FACTOR_TOKEN_SECONDS,
    });
    return { requiresTwoFactor: true, twoFactorToken, accessToken: null, profile: null };
  }

  /** Starts the device session and issues the access token that carries its ID. */
  private async startSession(
    account: UserAccount,
    signInMethod: SignInMethod,
    origin: SignInOrigin,
  ): Promise<AuthSessionResponse> {
    const session = await this.userSessionsService.startSession({
      userAccountId: account.userAccountId,
      signInMethod,
      device: origin.device,
      ipAddress: origin.ipAddress,
    });
    await this.userAccountsService.recordSuccessfulSignIn(account.userAccountId);

    const payload: JwtPayload = {
      sub: account.userAccountId,
      email: account.email,
      sid: session.userSessionId,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    await this.accountActivityService.record({
      userAccountId: account.userAccountId,
      waterStationId: account.waterStationId,
      userSessionId: session.userSessionId,
      type: ActivityType.SignedIn,
      description: `Signed in on ${session.deviceName}`,
      deviceName: session.deviceName,
      ipAddress: origin.ipAddress,
    });

    const profile = await this.profileService.getProfile(account.userAccountId, session.userSessionId);
    return { requiresTwoFactor: false, twoFactorToken: null, accessToken, profile };
  }

  /** Counts the wrong attempt (5 in a row lock the account for 15 minutes) and writes it to the activity log. */
  private async recordFailedSignIn(
    account: UserAccount,
    reason: string,
    origin: SignInOrigin,
  ): Promise<void> {
    await this.signInLockoutService.recordFailedAttempt(account.userAccountId);

    const deviceName = origin.device?.deviceName.trim() || UNKNOWN_DEVICE_NAME;
    await this.accountActivityService.record({
      userAccountId: account.userAccountId,
      waterStationId: account.waterStationId,
      type: ActivityType.SignInFailed,
      description: `${reason} on ${deviceName}`,
      deviceName,
      ipAddress: origin.ipAddress,
    });
  }

  private async verifyTwoFactorToken(twoFactorToken: string): Promise<TwoFactorTokenPayload> {
    let tokenPayload: Partial<TwoFactorTokenPayload>;
    try {
      tokenPayload = await this.jwtService.verifyAsync<Partial<TwoFactorTokenPayload>>(twoFactorToken);
    } catch {
      throw new UnauthorizedException(EXPIRED_TWO_FACTOR_MESSAGE);
    }

    const signInMethods: string[] = Object.values(SignInMethod);
    if (
      tokenPayload.purpose !== TWO_FACTOR_TOKEN_PURPOSE ||
      typeof tokenPayload.sub !== 'number' ||
      !tokenPayload.method ||
      !signInMethods.includes(tokenPayload.method)
    ) {
      // e.g. an access token sent in place of the two-factor token
      throw new UnauthorizedException(EXPIRED_TWO_FACTOR_MESSAGE);
    }
    return { sub: tokenPayload.sub, purpose: TWO_FACTOR_TOKEN_PURPOSE, method: tokenPayload.method };
  }
}
