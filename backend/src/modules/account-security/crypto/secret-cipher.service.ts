import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { AppConfig } from '../../../config/app-config';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const FORMAT_VERSION = 'v1';
const INITIALIZATION_VECTOR_BYTES = 12;
const KEY_BYTES = 32;
const KEY_DERIVATION_SALT = 'aquatap';

/**
 * Protects secrets that are stored in the database (two-step verification keys, backup codes),
 * so a copy of the database alone is not enough to use them.
 * Keys are derived from DATA_ENCRYPTION_KEY (or JWT_SECRET when it is not set).
 */
@Injectable()
export class SecretCipherService {
  private readonly encryptionKey: Buffer;
  private readonly hashingKey: Buffer;

  constructor(configService: ConfigService<AppConfig, true>) {
    const masterSecret = configService.get('auth.dataEncryptionKey', { infer: true });
    // Separate keys per purpose, both derived from the one configured secret (HKDF, RFC 5869).
    this.encryptionKey = this.deriveKey(masterSecret, 'data-at-rest-encryption');
    this.hashingKey = this.deriveKey(masterSecret, 'keyed-hash');
  }

  /** AES-256-GCM. Output: "v1.<iv>.<authentication tag>.<ciphertext>" (base64url parts). */
  encrypt(plainText: string): string {
    const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES);
    const cipher = createCipheriv(CIPHER_ALGORITHM, this.encryptionKey, initializationVector);
    const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

    return [FORMAT_VERSION, initializationVector, cipher.getAuthTag(), cipherText]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.');
  }

  /** Throws when the text was changed or was encrypted with another key. */
  decrypt(encryptedText: string): string {
    const [formatVersion, initializationVector, authenticationTag, cipherText] = encryptedText.split('.');
    if (formatVersion !== FORMAT_VERSION || !initializationVector || !authenticationTag || !cipherText) {
      throw new Error('The stored secret has an unknown format.');
    }

    const decipher = createDecipheriv(
      CIPHER_ALGORITHM,
      this.encryptionKey,
      Buffer.from(initializationVector, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authenticationTag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(cipherText, 'base64url')), decipher.final()]).toString(
      'utf8',
    );
  }

  /**
   * One-way keyed hash (HMAC-SHA256, 64 hex characters). Used for backup codes: the same code always
   * gives the same hash, but the hash cannot be turned back or guessed without the server key.
   */
  keyedHash(value: string): string {
    return createHmac('sha256', this.hashingKey).update(value, 'utf8').digest('hex');
  }

  private deriveKey(masterSecret: string, purpose: string): Buffer {
    return Buffer.from(hkdfSync('sha256', masterSecret, KEY_DERIVATION_SALT, purpose, KEY_BYTES));
  }
}
