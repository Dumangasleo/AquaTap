import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { decodeBase32, encodeBase32 } from './base32.util';

const TIME_STEP_SECONDS = 30;
const CODE_DIGITS = 6;
/** Accept the code of the previous and the next 30 seconds too (phone clocks are never exact). */
const ALLOWED_TIME_STEP_DRIFT = 1;
const SECRET_KEY_BYTES = 20;

export interface OtpAuthUrlOptions {
  secretKey: string;
  /** Shown in the authenticator app next to the code (the account email). */
  accountLabel: string;
  issuer: string;
}

/**
 * Time-based one-time passwords (RFC 6238: HMAC-SHA1, 30 seconds, 6 digits), the standard used by
 * Google Authenticator, Microsoft Authenticator, Authy and others.
 */
@Injectable()
export class TotpService {
  /** New random secret key in base32 (what the user scans or types into the authenticator app). */
  generateSecretKey(): string {
    return encodeBase32(randomBytes(SECRET_KEY_BYTES));
  }

  /** The 6-digit code for the given moment (default: now). */
  generateCode(secretKey: string, unixTimeSeconds: number = currentUnixTimeSeconds()): string {
    return this.generateCodeForTimeStep(secretKey, Math.floor(unixTimeSeconds / TIME_STEP_SECONDS));
  }

  isCodeValid(secretKey: string, code: string, unixTimeSeconds: number = currentUnixTimeSeconds()): boolean {
    const typedCode = code.trim();
    if (!/^\d{6}$/.test(typedCode)) return false;

    const currentTimeStep = Math.floor(unixTimeSeconds / TIME_STEP_SECONDS);
    let isValid = false;
    for (let drift = -ALLOWED_TIME_STEP_DRIFT; drift <= ALLOWED_TIME_STEP_DRIFT; drift += 1) {
      const expectedCode = this.generateCodeForTimeStep(secretKey, currentTimeStep + drift);
      // Compare every candidate in constant time; do not stop at the first match.
      if (timingSafeEqual(Buffer.from(expectedCode), Buffer.from(typedCode))) isValid = true;
    }
    return isValid;
  }

  /** Link behind the QR code: authenticator apps read the secret key and the labels from it. */
  buildOtpAuthUrl({ secretKey, accountLabel, issuer }: OtpAuthUrlOptions): string {
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}`;
    const parameters = new URLSearchParams({
      secret: secretKey,
      issuer,
      algorithm: 'SHA1',
      digits: String(CODE_DIGITS),
      period: String(TIME_STEP_SECONDS),
    });
    return `otpauth://totp/${label}?${parameters.toString()}`;
  }

  /** HOTP (RFC 4226) with the time step as the counter. */
  private generateCodeForTimeStep(secretKey: string, timeStep: number): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(timeStep));

    const hmac = createHmac('sha1', decodeBase32(secretKey)).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binaryCode =
      ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];

    return String(binaryCode % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, '0');
  }
}

function currentUnixTimeSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
