/**
 * Base32 (RFC 4648, no padding): the text format authenticator apps use for secret keys,
 * e.g. "JBSWY3DPEHPK3PXP".
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BITS_PER_CHARACTER = 5;

export function encodeBase32(bytes: Buffer): string {
  let encoded = '';
  let bitBuffer = 0;
  let bitCount = 0;

  for (const byte of bytes) {
    bitBuffer = (bitBuffer << 8) | byte;
    bitCount += 8;
    while (bitCount >= BITS_PER_CHARACTER) {
      encoded += BASE32_ALPHABET[(bitBuffer >>> (bitCount - BITS_PER_CHARACTER)) & 31];
      bitCount -= BITS_PER_CHARACTER;
    }
    // Keep only the bits that are not written yet, so the buffer never overflows 32 bits.
    bitBuffer &= (1 << bitCount) - 1;
  }

  if (bitCount > 0) {
    encoded += BASE32_ALPHABET[(bitBuffer << (BITS_PER_CHARACTER - bitCount)) & 31];
  }
  return encoded;
}

/** Accepts lower case, spaces and "=" padding, like keys typed or pasted by a person. */
export function decodeBase32(text: string): Buffer {
  const normalizedText = text.toUpperCase().replace(/[\s=]/g, '');
  const bytes: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  for (const character of normalizedText) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value === -1) throw new Error('The secret key is not valid base32 text.');

    bitBuffer = (bitBuffer << BITS_PER_CHARACTER) | value;
    bitCount += BITS_PER_CHARACTER;
    if (bitCount >= 8) {
      bytes.push((bitBuffer >>> (bitCount - 8)) & 255);
      bitCount -= 8;
      bitBuffer &= (1 << bitCount) - 1;
    }
  }
  return Buffer.from(bytes);
}
