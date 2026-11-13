-- =====================================================================
--  Migration 003 - Account security and profile
--    * UserAccount          : profile photo, password, two-step verification (2FA)
--    * UserSession          : devices where the account is signed in (sign out per device)
--    * TwoFactorRecoveryCode: one-time backup codes for two-step verification
--    * AccountActivity      : history of what the account did (audit trail)
--
--  For databases created BEFORE this feature. Fresh installs already get these
--  objects from aquatap_schema.sql. Safe to run more than once: it only adds
--  what is missing and never changes or deletes existing data.
--
--  Run in MySQL Workbench, or inside /backend:
--    npm run db:migrate -- ../database/migrations/003_account_security.sql
-- =====================================================================

USE aquatap_db;

-- ---------------------------------------------------------------------
-- UserAccount : new columns (added only when they do not exist yet)
-- ---------------------------------------------------------------------
SET @HasAccountSecurityColumns = (
  SELECT COUNT(*)
    FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND LOWER(TABLE_NAME) = 'useraccount'
     AND COLUMN_NAME = 'AvatarImage'
);

SET @AddAccountSecurityColumns = IF(
  @HasAccountSecurityColumns = 0,
  'ALTER TABLE UserAccount
     ADD COLUMN AvatarImage        MEDIUMTEXT   NULL COMMENT ''Profile photo as a small JPEG data URI (resized by the API).'' AFTER PhotoUrl,
     ADD COLUMN PasswordHash       VARCHAR(255) NULL COMMENT ''scrypt hash. NULL = the account signs in with Google only.'' AFTER AvatarImage,
     ADD COLUMN PasswordChangedAt  DATETIME     NULL AFTER PasswordHash,
     ADD COLUMN FailedSignInCount  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''Wrong passwords / codes in a row.'' AFTER PasswordChangedAt,
     ADD COLUMN SignInLockedUntil  DATETIME     NULL COMMENT ''Password sign-in is blocked until this time after too many wrong attempts.'' AFTER FailedSignInCount,
     ADD COLUMN IsTwoFactorEnabled TINYINT(1)   NOT NULL DEFAULT 0 AFTER SignInLockedUntil,
     ADD COLUMN TwoFactorSecret    VARCHAR(255) NULL COMMENT ''Encrypted authenticator secret. Set while IsTwoFactorEnabled = 0 means the setup is not finished.'' AFTER IsTwoFactorEnabled,
     ADD COLUMN TwoFactorEnabledAt DATETIME     NULL AFTER TwoFactorSecret',
  'SELECT ''UserAccount already has the account security columns'' AS Migration003'
);

PREPARE AddAccountSecurityColumnsStatement FROM @AddAccountSecurityColumns;
EXECUTE AddAccountSecurityColumnsStatement;
DEALLOCATE PREPARE AddAccountSecurityColumnsStatement;

-- ---------------------------------------------------------------------
-- UserSession : one row per device where the account is signed in
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS UserSession (
  UserSessionID   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  UserAccountID   INT UNSIGNED NOT NULL,
  DeviceName      VARCHAR(120) NOT NULL COMMENT 'e.g. "Samsung SM-A546E" or "Chrome on Windows".',
  DevicePlatform  ENUM ('Android', 'iOS', 'Web', 'Unknown') NOT NULL DEFAULT 'Unknown',
  AppVersion      VARCHAR(30)  NULL,
  IpAddress       VARCHAR(45)  NULL,
  SignInMethod    ENUM ('Google', 'Password', 'Developer') NOT NULL,
  SignedInAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  LastActiveAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ExpiresAt       DATETIME     NOT NULL,
  SignedOutAt     DATETIME     NULL COMMENT 'Set when the device is signed out. The session can no longer be used.',
  CONSTRAINT PK_UserSession PRIMARY KEY (UserSessionID),
  CONSTRAINT FK_UserSession_UserAccountID FOREIGN KEY (UserAccountID) REFERENCES UserAccount (UserAccountID),
  INDEX IX_UserSession_UserAccountID_SignedOutAt (UserAccountID, SignedOutAt)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- TwoFactorRecoveryCode : backup codes (each works once) for two-step verification
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TwoFactorRecoveryCode (
  TwoFactorRecoveryCodeID INT UNSIGNED NOT NULL AUTO_INCREMENT,
  UserAccountID           INT UNSIGNED NOT NULL,
  CodeHash                CHAR(64)     NOT NULL COMMENT 'Keyed SHA-256 (HMAC) of the code. The code itself is never stored.',
  UsedAt                  DATETIME     NULL,
  CreatedAt               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_TwoFactorRecoveryCode PRIMARY KEY (TwoFactorRecoveryCodeID),
  CONSTRAINT FK_TwoFactorRecoveryCode_UserAccountID FOREIGN KEY (UserAccountID) REFERENCES UserAccount (UserAccountID),
  INDEX IX_TwoFactorRecoveryCode_UserAccountID (UserAccountID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- AccountActivity : what the account did (sign-ins, orders, payments, settings)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS AccountActivity (
  AccountActivityID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  UserAccountID     INT UNSIGNED    NOT NULL,
  WaterStationID    INT UNSIGNED    NULL,
  UserSessionID     INT UNSIGNED    NULL COMMENT 'Device session that did the action.',
  ActivityType      VARCHAR(50)     NOT NULL COMMENT 'e.g. SignedIn, OrderPlaced, CreditsSettled (see ActivityType in the API).',
  ActivityCategory  ENUM ('Security', 'Profile', 'Orders', 'Payments', 'Shift', 'Station') NOT NULL,
  Description       VARCHAR(255)    NOT NULL COMMENT 'Plain sentence shown to the user.',
  DeviceName        VARCHAR(120)    NULL,
  IpAddress         VARCHAR(45)     NULL,
  CreatedAt         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_AccountActivity PRIMARY KEY (AccountActivityID),
  CONSTRAINT FK_AccountActivity_UserAccountID FOREIGN KEY (UserAccountID) REFERENCES UserAccount (UserAccountID),
  CONSTRAINT FK_AccountActivity_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  CONSTRAINT FK_AccountActivity_UserSessionID FOREIGN KEY (UserSessionID) REFERENCES UserSession (UserSessionID),
  INDEX IX_AccountActivity_UserAccountID_AccountActivityID (UserAccountID, AccountActivityID)
) ENGINE = InnoDB;
