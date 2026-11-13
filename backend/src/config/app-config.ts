/**
 * Typed application configuration built from environment variables.
 * Every module reads settings through `ConfigService<AppConfig, true>` instead of `process.env`.
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface AuthConfig {
  jwtSecret: string;
  /** Session length in seconds (from JWT_EXPIRES_IN_DAYS). */
  jwtExpiresInSeconds: number;
  googleClientIds: string[];
  googleWebClientId: string | null;
  isDevSignInEnabled: boolean;
  /** Emails that become AquaTap SystemAdmin (KYB reviewers) when they sign in. */
  systemAdminEmails: string[];
  /**
   * Secret used to encrypt data at rest (two-step verification secrets, backup codes).
   * DATA_ENCRYPTION_KEY, or JWT_SECRET when it is not set.
   */
  dataEncryptionKey: string;
  /** Password / verification-code attempts allowed per minute from one IP address. */
  signInRateLimitPerMinute: number;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
  auth: AuthConfig;
}

function readRequired(variableName: string): string {
  const value = process.env[variableName];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }
  return value.trim();
}

function readOptional(variableName: string): string | null {
  const value = process.env[variableName]?.trim();
  return value ? value : null;
}

function readPositiveInteger(variableName: string, defaultValue: number): number {
  const value = Number(readOptional(variableName) ?? defaultValue);
  return Number.isInteger(value) && value > 0 ? value : defaultValue;
}

function splitCommaList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function loadAppConfig(): AppConfig {
  const googleWebClientId = readOptional('GOOGLE_WEB_CLIENT_ID');
  const additionalClientIds = splitCommaList(readOptional('GOOGLE_ADDITIONAL_CLIENT_IDS'));
  const jwtSecret = readRequired('JWT_SECRET');

  return {
    port: Number(process.env.PORT ?? 3000),
    database: {
      host: readRequired('DB_HOST'),
      port: Number(process.env.DB_PORT ?? 3306),
      name: readRequired('DB_NAME'),
      user: readRequired('DB_USER'),
      password: process.env.DB_PASSWORD ?? '',
    },
    auth: {
      jwtSecret,
      jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_DAYS ?? 30) * 24 * 60 * 60,
      googleWebClientId,
      googleClientIds: [googleWebClientId, ...additionalClientIds].filter(
        (clientId): clientId is string => clientId !== null,
      ),
      isDevSignInEnabled: process.env.AUTH_DEV_SIGN_IN_ENABLED === 'true',
      systemAdminEmails: splitCommaList(readOptional('SYSTEM_ADMIN_EMAILS')).map((email) =>
        email.toLowerCase(),
      ),
      dataEncryptionKey: readOptional('DATA_ENCRYPTION_KEY') ?? jwtSecret,
      signInRateLimitPerMinute: readPositiveInteger('AUTH_RATE_LIMIT_PER_MINUTE', 10),
    },
  };
}
