-- =====================================================================
--  AquaTap - Water Refilling Station Management
--  MySQL 8.0 schema
--
--  Naming conventions
--    * Tables         : PascalCase, singular            (CustomerOrder)
--    * Primary key    : <TableName>ID                   (CustomerOrderID)
--    * Foreign key    : <ReferencedTableName>ID         (CustomerOrder.CustomerID -> Customer.CustomerID)
--    * Booleans       : Is<Something>                   (IsActive)
--    * Timestamps     : <Event>At                       (CreatedAt, PaidAt)
--    * Constraints    : PK_/FK_/UQ_/IX_<Table>_<Column> (FK_CustomerOrder_CustomerID)
--
--  Run this script in MySQL Workbench (or `npm run db:setup` inside /backend).
--  It is idempotent: it only creates objects that do not exist yet.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS aquatap_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE aquatap_db;

-- ---------------------------------------------------------------------
-- WaterStation : one water refilling business (tenant)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS WaterStation (
  WaterStationID    INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  StationName       VARCHAR(120)   NOT NULL,
  RegisteredBusinessName  VARCHAR(150) NULL COMMENT 'Name on the BIR / DTI / SEC registration.',
  TaxIdentificationNumber VARCHAR(20)  NULL COMMENT 'BIR TIN of the business.',
  Address           VARCHAR(255)   NOT NULL,
  ContactNumber     VARCHAR(30)    NOT NULL,
  Latitude          DECIMAL(10, 7) NULL,
  Longitude         DECIMAL(10, 7) NULL,
  PricePerGallon    DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
  ContractTemplate  TEXT           NULL COMMENT 'Optional borrowing contract text. Supports {{FullName}}, {{Address}}, {{Occupation}}, {{ContactNumber}}, {{BorrowedGallons}}, {{StationName}}, {{Date}} placeholders.',
  VerificationStatus      ENUM ('NotSubmitted', 'UnderReview', 'Verified', 'Rejected') NOT NULL DEFAULT 'NotSubmitted'
                          COMMENT 'KYB status. Only Verified stations are shown to customers.',
  VerificationRemarks     VARCHAR(255) NULL COMMENT 'Reason when the KYB documents were rejected.',
  VerificationSubmittedAt DATETIME     NULL,
  VerifiedAt              DATETIME     NULL,
  IsActive          TINYINT(1)     NOT NULL DEFAULT 1,
  CreatedAt         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_WaterStation PRIMARY KEY (WaterStationID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- UserAccount : login identity (Google SSO, optional password + two-step verification).
-- Role decides which app the user sees.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS UserAccount (
  UserAccountID   INT UNSIGNED                          NOT NULL AUTO_INCREMENT,
  Email           VARCHAR(190)                          NOT NULL,
  GoogleSubject   VARCHAR(64)                           NULL COMMENT 'Stable Google account id (the "sub" claim).',
  FullName        VARCHAR(150)                          NULL,
  PhotoUrl        VARCHAR(500)                          NULL COMMENT 'Photo of the Google account (not shown when AvatarImage is set).',
  AvatarImage     MEDIUMTEXT                            NULL COMMENT 'Profile photo as a small JPEG data URI (resized by the API).',
  PasswordHash    VARCHAR(255)                          NULL COMMENT 'scrypt hash. NULL = the account signs in with Google only.',
  PasswordChangedAt  DATETIME                           NULL,
  FailedSignInCount  INT UNSIGNED                       NOT NULL DEFAULT 0 COMMENT 'Wrong passwords / codes in a row.',
  SignInLockedUntil  DATETIME                           NULL COMMENT 'Password sign-in is blocked until this time after too many wrong attempts.',
  IsTwoFactorEnabled TINYINT(1)                         NOT NULL DEFAULT 0,
  TwoFactorSecret    VARCHAR(255)                       NULL COMMENT 'Encrypted authenticator secret. Set while IsTwoFactorEnabled = 0 means the setup is not finished.',
  TwoFactorEnabledAt DATETIME                           NULL,
  UserRole        ENUM ('SystemAdmin', 'Admin', 'Employee', 'Customer') NULL COMMENT 'NULL until the user finishes onboarding. SystemAdmin = AquaTap platform reviewer (KYB).',
  WaterStationID  INT UNSIGNED                          NULL,
  IsActive        TINYINT(1)                            NOT NULL DEFAULT 1,
  LastLoginAt     DATETIME                              NULL,
  CreatedAt       DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt       DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_UserAccount PRIMARY KEY (UserAccountID),
  CONSTRAINT UQ_UserAccount_Email UNIQUE (Email),
  CONSTRAINT UQ_UserAccount_GoogleSubject UNIQUE (GoogleSubject),
  CONSTRAINT FK_UserAccount_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Employee : staff / delivery rider of a station (the owner also has a row, IsOwner = 1)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Employee (
  EmployeeID      INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  WaterStationID  INT UNSIGNED   NOT NULL,
  UserAccountID   INT UNSIGNED   NULL COMMENT 'Linked automatically the first time the invited email signs in.',
  FullName        VARCHAR(150)   NOT NULL,
  Email           VARCHAR(190)   NOT NULL,
  ContactNumber   VARCHAR(30)    NULL,
  IsOwner         TINYINT(1)     NOT NULL DEFAULT 0,
  IsActive        TINYINT(1)     NOT NULL DEFAULT 1,
  LastLatitude    DECIMAL(10, 7) NULL,
  LastLongitude   DECIMAL(10, 7) NULL,
  LastLocationAt  DATETIME       NULL,
  CreatedAt       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_Employee PRIMARY KEY (EmployeeID),
  CONSTRAINT UQ_Employee_Email UNIQUE (Email),
  CONSTRAINT UQ_Employee_UserAccountID UNIQUE (UserAccountID),
  CONSTRAINT FK_Employee_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  CONSTRAINT FK_Employee_UserAccountID FOREIGN KEY (UserAccountID) REFERENCES UserAccount (UserAccountID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Customer : household / business that orders water from one station
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Customer (
  CustomerID      INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  WaterStationID  INT UNSIGNED   NOT NULL,
  UserAccountID   INT UNSIGNED   NULL,
  FullName        VARCHAR(150)   NOT NULL,
  Address         VARCHAR(255)   NOT NULL,
  Occupation      VARCHAR(100)   NULL,
  ContactNumber   VARCHAR(30)    NOT NULL,
  Landmark        VARCHAR(255)   NULL,
  Latitude        DECIMAL(10, 7) NULL,
  Longitude       DECIMAL(10, 7) NULL,
  CreatedAt       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_Customer PRIMARY KEY (CustomerID),
  CONSTRAINT UQ_Customer_UserAccountID UNIQUE (UserAccountID),
  CONSTRAINT FK_Customer_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  CONSTRAINT FK_Customer_UserAccountID FOREIGN KEY (UserAccountID) REFERENCES UserAccount (UserAccountID),
  INDEX IX_Customer_WaterStationID_FullName (WaterStationID, FullName)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- GallonContract : the signed electronic borrowing agreement ("kasulatan")
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS GallonContract (
  GallonContractID  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  CustomerID        INT UNSIGNED NOT NULL,
  WaterStationID    INT UNSIGNED NOT NULL,
  FullName          VARCHAR(150) NOT NULL,
  Address           VARCHAR(255) NOT NULL,
  Occupation        VARCHAR(100) NULL,
  ContactNumber     VARCHAR(30)  NOT NULL,
  BorrowedGallons   INT UNSIGNED NOT NULL,
  ContractBody      TEXT         NULL COMMENT 'Template text with the borrower details already filled in (snapshot at signing).',
  SignatureSvg      MEDIUMTEXT   NOT NULL,
  SignedAt          DATETIME     NOT NULL,
  CreatedAt         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_GallonContract PRIMARY KEY (GallonContractID),
  CONSTRAINT FK_GallonContract_CustomerID FOREIGN KEY (CustomerID) REFERENCES Customer (CustomerID),
  CONSTRAINT FK_GallonContract_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- EmployeeShift : time in / time out of an employee for one day.
-- Totals are snapshotted at time-out so the daily record is saved automatically.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS EmployeeShift (
  EmployeeShiftID        INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  EmployeeID             INT UNSIGNED   NOT NULL,
  WaterStationID         INT UNSIGNED   NOT NULL,
  ShiftDate              DATE           NOT NULL,
  TimeIn                 DATETIME       NOT NULL,
  TimeOut                DATETIME       NULL,
  TotalDeliveredOrders   INT UNSIGNED   NOT NULL DEFAULT 0,
  TotalGallonsDelivered  INT UNSIGNED   NOT NULL DEFAULT 0,
  TotalGallonsReturned   INT UNSIGNED   NOT NULL DEFAULT 0,
  TotalCashSales         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  TotalCreditSales       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  TotalCollections       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  TotalExpenses          DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  NetCashOnHand          DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  Remarks                VARCHAR(255)   NULL,
  CreatedAt              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt              DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_EmployeeShift PRIMARY KEY (EmployeeShiftID),
  CONSTRAINT FK_EmployeeShift_EmployeeID FOREIGN KEY (EmployeeID) REFERENCES Employee (EmployeeID),
  CONSTRAINT FK_EmployeeShift_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  INDEX IX_EmployeeShift_WaterStationID_ShiftDate (WaterStationID, ShiftDate)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- CustomerOrder : one water delivery order
-- Remaining gallons of a customer =
--     SUM(GallonContract.BorrowedGallons)
--   + SUM(GallonsOrdered  of Delivered orders)
--   - SUM(ReturnedGallons of Delivered orders)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS CustomerOrder (
  CustomerOrderID    INT UNSIGNED                                                                 NOT NULL AUTO_INCREMENT,
  OrderNumber        VARCHAR(30)                                                                  NOT NULL,
  WaterStationID     INT UNSIGNED                                                                 NOT NULL,
  CustomerID         INT UNSIGNED                                                                 NOT NULL,
  EmployeeID         INT UNSIGNED                                                                 NULL COMMENT 'Employee who accepted / delivered the order.',
  EmployeeShiftID    INT UNSIGNED                                                                 NULL COMMENT 'Shift active when the order was accepted.',
  GallonsOrdered     INT UNSIGNED                                                                 NOT NULL,
  ReturnedGallons    INT UNSIGNED                                                                 NOT NULL DEFAULT 0,
  PricePerGallon     DECIMAL(10, 2)                                                               NOT NULL,
  TotalAmount        DECIMAL(12, 2)                                                               NOT NULL,
  PaymentType        ENUM ('Cash', 'Credit')                                                      NOT NULL COMMENT 'Cash = paid on delivery, Credit = utang.',
  PaymentMode        ENUM ('Cash', 'GCash', 'BankTransfer')                                       NULL,
  PaymentStatus      ENUM ('Unpaid', 'Paid')                                                      NOT NULL DEFAULT 'Unpaid',
  PaymentReference   VARCHAR(100)                                                                 NULL,
  DeliveryAddress    VARCHAR(255)                                                                 NOT NULL,
  DeliveryLatitude   DECIMAL(10, 7)                                                               NULL,
  DeliveryLongitude  DECIMAL(10, 7)                                                               NULL,
  CustomerNotes      VARCHAR(500)                                                                 NULL,
  OrderStatus        ENUM ('Pending', 'Accepted', 'Delivered', 'Declined', 'Cancelled', 'Failed') NOT NULL DEFAULT 'Pending',
  StatusReason       VARCHAR(255)                                                                 NULL COMMENT 'Reason when Declined / Cancelled / Failed.',
  OrderedAt          DATETIME                                                                     NOT NULL,
  AcceptedAt         DATETIME                                                                     NULL,
  DeliveredAt        DATETIME                                                                     NULL,
  ClosedAt           DATETIME                                                                     NULL COMMENT 'When the order reached a final status.',
  PaidAt             DATETIME                                                                     NULL,
  CreatedAt          DATETIME                                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt          DATETIME                                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_CustomerOrder PRIMARY KEY (CustomerOrderID),
  CONSTRAINT UQ_CustomerOrder_OrderNumber UNIQUE (OrderNumber),
  CONSTRAINT FK_CustomerOrder_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  CONSTRAINT FK_CustomerOrder_CustomerID FOREIGN KEY (CustomerID) REFERENCES Customer (CustomerID),
  CONSTRAINT FK_CustomerOrder_EmployeeID FOREIGN KEY (EmployeeID) REFERENCES Employee (EmployeeID),
  CONSTRAINT FK_CustomerOrder_EmployeeShiftID FOREIGN KEY (EmployeeShiftID) REFERENCES EmployeeShift (EmployeeShiftID),
  INDEX IX_CustomerOrder_WaterStationID_OrderStatus (WaterStationID, OrderStatus),
  INDEX IX_CustomerOrder_CustomerID_OrderedAt (CustomerID, OrderedAt),
  INDEX IX_CustomerOrder_WaterStationID_ClosedAt (WaterStationID, ClosedAt)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Payment : money received for an order (cash on delivery or credit/utang settlement)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Payment (
  PaymentID        INT UNSIGNED                           NOT NULL AUTO_INCREMENT,
  CustomerOrderID  INT UNSIGNED                           NOT NULL,
  WaterStationID   INT UNSIGNED                           NOT NULL,
  CustomerID       INT UNSIGNED                           NOT NULL,
  EmployeeID       INT UNSIGNED                           NULL COMMENT 'Employee who received the payment.',
  AmountPaid       DECIMAL(12, 2)                         NOT NULL,
  PaymentMode      ENUM ('Cash', 'GCash', 'BankTransfer') NOT NULL,
  ReferenceNumber  VARCHAR(100)                           NULL,
  PaidAt           DATETIME                               NOT NULL COMMENT 'Actual date of payment.',
  Remarks          VARCHAR(255)                           NULL,
  CreatedAt        DATETIME                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_Payment PRIMARY KEY (PaymentID),
  CONSTRAINT FK_Payment_CustomerOrderID FOREIGN KEY (CustomerOrderID) REFERENCES CustomerOrder (CustomerOrderID),
  CONSTRAINT FK_Payment_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  CONSTRAINT FK_Payment_CustomerID FOREIGN KEY (CustomerID) REFERENCES Customer (CustomerID),
  CONSTRAINT FK_Payment_EmployeeID FOREIGN KEY (EmployeeID) REFERENCES Employee (EmployeeID),
  INDEX IX_Payment_WaterStationID_PaidAt (WaterStationID, PaidAt)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Expense : operating expenses (food, fuel, flat tire, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Expense (
  ExpenseID        INT UNSIGNED                                                                 NOT NULL AUTO_INCREMENT,
  WaterStationID   INT UNSIGNED                                                                 NOT NULL,
  EmployeeID       INT UNSIGNED                                                                 NULL,
  EmployeeShiftID  INT UNSIGNED                                                                 NULL,
  ExpenseCategory  ENUM ('Food', 'Fuel', 'VehicleRepair', 'Maintenance', 'Supplies', 'Other') NOT NULL,
  Amount           DECIMAL(10, 2)                                                               NOT NULL,
  Description      VARCHAR(255)                                                                 NULL,
  ExpenseDate      DATE                                                                         NOT NULL,
  CreatedAt        DATETIME                                                                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_Expense PRIMARY KEY (ExpenseID),
  CONSTRAINT FK_Expense_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID),
  CONSTRAINT FK_Expense_EmployeeID FOREIGN KEY (EmployeeID) REFERENCES Employee (EmployeeID),
  CONSTRAINT FK_Expense_EmployeeShiftID FOREIGN KEY (EmployeeShiftID) REFERENCES EmployeeShift (EmployeeShiftID),
  INDEX IX_Expense_WaterStationID_ExpenseDate (WaterStationID, ExpenseDate)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- PaymentChannel : GCash / bank account (with QR code) customers can pay to
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS PaymentChannel (
  PaymentChannelID  INT UNSIGNED                  NOT NULL AUTO_INCREMENT,
  WaterStationID    INT UNSIGNED                  NOT NULL,
  ChannelType       ENUM ('GCash', 'BankTransfer') NOT NULL,
  ChannelName       VARCHAR(100)                  NOT NULL COMMENT 'e.g. GCash, BDO, BPI, Maya',
  AccountName       VARCHAR(150)                  NOT NULL,
  AccountNumber     VARCHAR(60)                   NOT NULL,
  QrImage           MEDIUMTEXT                    NULL COMMENT 'QR code image as a data URI.',
  IsActive          TINYINT(1)                    NOT NULL DEFAULT 1,
  CreatedAt         DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt         DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT PK_PaymentChannel PRIMARY KEY (PaymentChannelID),
  CONSTRAINT FK_PaymentChannel_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- StationDocument : KYB (Know Your Business) files uploaded by the station owner
-- (BIR Certificate of Registration, Mayor's permit, DTI/SEC, sanitary permit, water analysis, owner ID)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS StationDocument (
  StationDocumentID  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  WaterStationID     INT UNSIGNED NOT NULL,
  DocumentType       ENUM ('BirCertificateOfRegistration', 'MayorsBusinessPermit', 'DtiOrSecRegistration', 'SanitaryPermit',
                           'WaterAnalysisCertificate', 'OwnerValidId', 'Other') NOT NULL,
  FileName           VARCHAR(150) NOT NULL,
  MimeType           VARCHAR(60)  NOT NULL,
  FileSizeBytes      INT UNSIGNED NOT NULL,
  FileData           MEDIUMTEXT   NOT NULL COMMENT 'Document image as a data URI.',
  UploadedAt         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PK_StationDocument PRIMARY KEY (StationDocumentID),
  CONSTRAINT UQ_StationDocument_WaterStationID_DocumentType UNIQUE (WaterStationID, DocumentType),
  CONSTRAINT FK_StationDocument_WaterStationID FOREIGN KEY (WaterStationID) REFERENCES WaterStation (WaterStationID)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- UserSession : one row per device where the account is signed in.
-- The access token carries the UserSessionID, so signing out a device ends that token.
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
-- AccountActivity : what the account did (sign-ins, orders, payments, settings).
-- Shown to the user in Profile > Activity.
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
