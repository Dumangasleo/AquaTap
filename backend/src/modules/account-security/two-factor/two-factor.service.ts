import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import * as QRCode from 'qrcode';
import { DataSource, IsNull, Repository } from 'typeorm';
import { currentDateTime } from '../../../common/utils/date-time.util';
import { UserAccount } from '../../user-accounts/user-account.entity';
import { UserAccountsService } from '../../user-accounts/user-accounts.service';
import { SecretCipherService } from '../crypto/secret-cipher.service';
import { RecoveryCodesResponse, TwoFactorSetupResponse } from '../dto/account-security.dto';
import { TotpService } from './totp.service';
import { TwoFactorRecoveryCode } from './two-factor-recovery-code.entity';

const AUTHENTICATOR_ISSUER = 'AquaTap';
const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_GROUP_LENGTH = 4;
/** Letters and numbers that are easy to read and type (no 0/O, 1/I/L). */
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const AUTHENTICATOR_CODE_PATTERN = /^\d{6}$/;
const RECOVERY_CODE_PATTERN = /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/;
const WRONG_CODE_MESSAGE = 'That code is not correct. Check your authenticator app and try again.';

/** What the user typed, cleaned up: spaces removed, upper case. */
function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase();
}

/** "abcd2345" / "ABCD-2345" -> "ABCD-2345" */
function formatRecoveryCode(normalizedCode: string): string {
  const characters = normalizedCode.replace('-', '');
  return `${characters.slice(0, RECOVERY_CODE_GROUP_LENGTH)}-${characters.slice(RECOVERY_CODE_GROUP_LENGTH)}`;
}

/**
 * Two-step verification (2FA) with an authenticator app, plus one-time backup codes
 * for when the phone with the app is lost.
 */
@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(UserAccount) private readonly userAccountRepository: Repository<UserAccount>,
    @InjectRepository(TwoFactorRecoveryCode)
    private readonly recoveryCodeRepository: Repository<TwoFactorRecoveryCode>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly userAccountsService: UserAccountsService,
    private readonly totpService: TotpService,
    private readonly secretCipherService: SecretCipherService,
  ) {}

  /**
   * Step 1: creates a new secret key and returns it as text, as a link and as a QR code.
   * Nothing is switched on until the user confirms a code (enable).
   */
  async beginSetup(userAccountId: number): Promise<TwoFactorSetupResponse> {
    const account = await this.findAccountOrThrow(userAccountId);
    if (account.isTwoFactorEnabled) {
      throw new ConflictException('Two-step verification is already on.');
    }

    const secretKey = this.totpService.generateSecretKey();
    await this.userAccountRepository.update(userAccountId, {
      twoFactorSecret: this.secretCipherService.encrypt(secretKey),
    });

    const otpauthUrl = this.totpService.buildOtpAuthUrl({
      secretKey,
      accountLabel: account.email,
      issuer: AUTHENTICATOR_ISSUER,
    });
    const qrCodeDataUri = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });

    return { secretKey, otpauthUrl, qrCodeDataUri };
  }

  /** Step 2: the user types a code from the app. Turns 2FA on and returns the backup codes (shown once). */
  async enable(userAccountId: number, code: string): Promise<RecoveryCodesResponse> {
    const account = await this.findAccountOrThrow(userAccountId);
    if (account.isTwoFactorEnabled) {
      throw new ConflictException('Two-step verification is already on.');
    }
    const secretKey = this.readSecretKey(account);
    if (!secretKey) {
      throw new BadRequestException(
        'Start the setup first, then enter the code from your authenticator app.',
      );
    }
    if (!this.totpService.isCodeValid(secretKey, normalizeCode(code))) {
      throw new BadRequestException(WRONG_CODE_MESSAGE);
    }

    const recoveryCodes = this.generateRecoveryCodes();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(UserAccount, userAccountId, {
        isTwoFactorEnabled: true,
        twoFactorEnabledAt: currentDateTime(),
      });
      await this.replaceRecoveryCodes(
        manager.getRepository(TwoFactorRecoveryCode),
        userAccountId,
        recoveryCodes,
      );
    });
    return { recoveryCodes };
  }

  /** Turns 2FA off. Needs a code from the app (or a backup code) so a borrowed phone cannot do it. */
  async disable(userAccountId: number, code: string): Promise<void> {
    const account = await this.findEnabledAccountOrThrow(userAccountId);
    await this.assertCodeIsValid(account, code);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(UserAccount, userAccountId, {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnabledAt: null,
      });
      await manager.delete(TwoFactorRecoveryCode, { userAccountId });
    });
  }

  /** Replaces all backup codes with new ones (the old ones stop working). */
  async regenerateRecoveryCodes(userAccountId: number, code: string): Promise<RecoveryCodesResponse> {
    const account = await this.findEnabledAccountOrThrow(userAccountId);
    await this.assertCodeIsValid(account, code);

    const recoveryCodes = this.generateRecoveryCodes();
    await this.replaceRecoveryCodes(this.recoveryCodeRepository, userAccountId, recoveryCodes);
    return { recoveryCodes };
  }

  /**
   * Second sign-in step: true when `code` is the current authenticator code or an unused backup code
   * (a backup code is used up by this call).
   * @param account loaded with UserAccountsService.findWithCredentials()
   */
  async verifySignInCode(account: UserAccount, code: string): Promise<boolean> {
    const secretKey = account.isTwoFactorEnabled ? this.readSecretKey(account) : null;
    if (!secretKey) return false;

    const normalizedCode = normalizeCode(code);
    if (AUTHENTICATOR_CODE_PATTERN.test(normalizedCode)) {
      return this.totpService.isCodeValid(secretKey, normalizedCode);
    }
    if (RECOVERY_CODE_PATTERN.test(normalizedCode)) {
      return this.useRecoveryCode(account.userAccountId, formatRecoveryCode(normalizedCode));
    }
    return false;
  }

  private async assertCodeIsValid(account: UserAccount, code: string): Promise<void> {
    if (!(await this.verifySignInCode(account, code))) {
      // 400 (not 401): the session is fine, only the typed code is wrong.
      throw new BadRequestException(WRONG_CODE_MESSAGE);
    }
  }

  /** Marks the backup code as used. The WHERE clause makes sure a code can never be used twice. */
  private async useRecoveryCode(userAccountId: number, recoveryCode: string): Promise<boolean> {
    const result = await this.recoveryCodeRepository.update(
      { userAccountId, codeHash: this.secretCipherService.keyedHash(recoveryCode), usedAt: IsNull() },
      { usedAt: currentDateTime() },
    );
    return (result.affected ?? 0) === 1;
  }

  private async replaceRecoveryCodes(
    recoveryCodeRepository: Repository<TwoFactorRecoveryCode>,
    userAccountId: number,
    recoveryCodes: string[],
  ): Promise<void> {
    const createdAt = currentDateTime();
    await recoveryCodeRepository.delete({ userAccountId });
    await recoveryCodeRepository.insert(
      recoveryCodes.map((recoveryCode) => ({
        userAccountId,
        codeHash: this.secretCipherService.keyedHash(recoveryCode),
        usedAt: null,
        createdAt,
      })),
    );
  }

  private generateRecoveryCodes(): string[] {
    const generateGroup = () =>
      Array.from(
        { length: RECOVERY_CODE_GROUP_LENGTH },
        () => RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)],
      ).join('');

    const recoveryCodes = new Set<string>();
    while (recoveryCodes.size < RECOVERY_CODE_COUNT) {
      recoveryCodes.add(`${generateGroup()}-${generateGroup()}`);
    }
    return [...recoveryCodes];
  }

  /** The decrypted authenticator secret, or null when none is stored. */
  private readSecretKey(account: UserAccount): string | null {
    return account.twoFactorSecret ? this.secretCipherService.decrypt(account.twoFactorSecret) : null;
  }

  private async findAccountOrThrow(userAccountId: number): Promise<UserAccount> {
    const account = await this.userAccountsService.findWithCredentials({ userAccountId });
    if (!account) throw new UnauthorizedException('Please sign in again.');
    return account;
  }

  private async findEnabledAccountOrThrow(userAccountId: number): Promise<UserAccount> {
    const account = await this.findAccountOrThrow(userAccountId);
    if (!account.isTwoFactorEnabled) {
      throw new BadRequestException('Two-step verification is not turned on.');
    }
    return account;
  }
}
