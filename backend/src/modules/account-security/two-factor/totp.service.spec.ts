import { decodeBase32, encodeBase32 } from './base32.util';
import { TotpService } from './totp.service';

describe('base32', () => {
  // Test vectors from RFC 4648, section 10.
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes "%s" as "%s" and decodes it back', (plainText, base32Text) => {
    expect(encodeBase32(Buffer.from(plainText, 'ascii'))).toBe(base32Text);
    expect(decodeBase32(base32Text).toString('ascii')).toBe(plainText);
  });

  it('accepts lower case, spaces and padding', () => {
    expect(decodeBase32('mzxw 6ytb oi==').toString('ascii')).toBe('foobar');
  });

  it('rejects characters outside the base32 alphabet', () => {
    expect(() => decodeBase32('MZXW1')).toThrow();
  });
});

describe('TotpService', () => {
  const totpService = new TotpService();
  // RFC 6238, appendix B: the SHA-1 secret is the ASCII text "12345678901234567890".
  const rfcSecretKey = encodeBase32(Buffer.from('12345678901234567890', 'ascii'));

  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('generates the RFC 6238 code at T=%d', (unixTimeSeconds, expectedCode) => {
    expect(totpService.generateCode(rfcSecretKey, unixTimeSeconds)).toBe(expectedCode);
  });

  it('accepts the current code and the codes of the previous and next 30 seconds', () => {
    const now = 1234567890;
    expect(totpService.isCodeValid(rfcSecretKey, totpService.generateCode(rfcSecretKey, now), now)).toBe(
      true,
    );
    expect(totpService.isCodeValid(rfcSecretKey, totpService.generateCode(rfcSecretKey, now - 30), now)).toBe(
      true,
    );
    expect(totpService.isCodeValid(rfcSecretKey, totpService.generateCode(rfcSecretKey, now + 30), now)).toBe(
      true,
    );
  });

  it('rejects codes that are too old, wrong, or not 6 digits', () => {
    const now = 1234567890;
    expect(totpService.isCodeValid(rfcSecretKey, totpService.generateCode(rfcSecretKey, now - 90), now)).toBe(
      false,
    );
    expect(totpService.isCodeValid(rfcSecretKey, '000000', now)).toBe(false);
    expect(totpService.isCodeValid(rfcSecretKey, '12345', now)).toBe(false);
    expect(totpService.isCodeValid(rfcSecretKey, 'abcdef', now)).toBe(false);
  });

  it('creates a new 32-character base32 secret key every time', () => {
    const firstSecretKey = totpService.generateSecretKey();
    const secondSecretKey = totpService.generateSecretKey();
    expect(firstSecretKey).toMatch(/^[A-Z2-7]{32}$/);
    expect(firstSecretKey).not.toBe(secondSecretKey);
  });

  it('builds an otpauth link that authenticator apps understand', () => {
    const otpAuthUrl = totpService.buildOtpAuthUrl({
      secretKey: rfcSecretKey,
      accountLabel: 'juan@aquatap.test',
      issuer: 'AquaTap',
    });
    expect(otpAuthUrl).toBe(
      `otpauth://totp/AquaTap:juan%40aquatap.test?secret=${rfcSecretKey}&issuer=AquaTap&algorithm=SHA1&digits=6&period=30`,
    );
  });
});
