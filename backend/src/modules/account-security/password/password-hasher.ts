import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const HASH_SCHEME = 'scrypt';
/** scrypt work factors: N = CPU/memory cost (2^15), r = block size, p = parallelisation. */
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
/** scrypt needs about 128 * N * r bytes (32 MB here); allow some room above that. */
const MAX_MEMORY_BYTES = 64 * 1024 * 1024;

interface ScryptParameters {
  cost: number;
  blockSize: number;
  parallelization: number;
}

/**
 * Hashes passwords with scrypt (built into Node, memory-hard, no native add-on to install).
 * Stored format: "scrypt$<N>$<r>$<p>$<salt>$<hash>" so the work factors can be raised later
 * without breaking existing passwords.
 */
@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const parameters: ScryptParameters = {
      cost: COST,
      blockSize: BLOCK_SIZE,
      parallelization: PARALLELIZATION,
    };
    const derivedKey = await this.deriveKey(password, salt, parameters);

    return [
      HASH_SCHEME,
      parameters.cost,
      parameters.blockSize,
      parameters.parallelization,
      salt.toString('base64'),
      derivedKey.toString('base64'),
    ].join('$');
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [scheme, cost, blockSize, parallelization, salt, expectedKey] = storedHash.split('$');
    if (scheme !== HASH_SCHEME || !salt || !expectedKey) return false;

    const expectedKeyBytes = Buffer.from(expectedKey, 'base64');
    const derivedKey = await this.deriveKey(
      password,
      Buffer.from(salt, 'base64'),
      { cost: Number(cost), blockSize: Number(blockSize), parallelization: Number(parallelization) },
      expectedKeyBytes.length,
    );
    return derivedKey.length === expectedKeyBytes.length && timingSafeEqual(derivedKey, expectedKeyBytes);
  }

  /**
   * Spends the same time as a real check. Used when the email has no password, so the response time
   * does not reveal which emails are registered.
   */
  async simulateVerify(password: string): Promise<void> {
    await this.deriveKey(password, randomBytes(SALT_BYTES), {
      cost: COST,
      blockSize: BLOCK_SIZE,
      parallelization: PARALLELIZATION,
    });
  }

  private deriveKey(
    password: string,
    salt: Buffer,
    parameters: ScryptParameters,
    keyBytes: number = KEY_BYTES,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(
        password.normalize('NFKC'),
        salt,
        keyBytes,
        {
          N: parameters.cost,
          r: parameters.blockSize,
          p: parameters.parallelization,
          maxmem: MAX_MEMORY_BYTES,
        },
        (error, derivedKey) => (error ? reject(error) : resolve(derivedKey)),
      );
    });
  }
}
