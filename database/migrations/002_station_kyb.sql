-- =====================================================================
--  Migration 002 - Station KYB (Know Your Business) verification
--  For databases created BEFORE this feature. Fresh installs already get
--  these objects from aquatap_schema.sql. Run once.
-- =====================================================================

USE aquatap_db;

ALTER TABLE WaterStation
  ADD COLUMN RegisteredBusinessName  VARCHAR(150) NULL AFTER StationName,
  ADD COLUMN TaxIdentificationNumber VARCHAR(20)  NULL AFTER RegisteredBusinessName,
  ADD COLUMN VerificationStatus      ENUM ('NotSubmitted', 'UnderReview', 'Verified', 'Rejected') NOT NULL DEFAULT 'NotSubmitted' AFTER ContractTemplate,
  ADD COLUMN VerificationRemarks     VARCHAR(255) NULL AFTER VerificationStatus,
  ADD COLUMN VerificationSubmittedAt DATETIME     NULL AFTER VerificationRemarks,
  ADD COLUMN VerifiedAt              DATETIME     NULL AFTER VerificationSubmittedAt;

ALTER TABLE UserAccount
  MODIFY COLUMN UserRole ENUM ('SystemAdmin', 'Admin', 'Employee', 'Customer') NULL COMMENT 'NULL until the user finishes onboarding.';

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

-- Stations that already exist (e.g. the demo station) stay visible to customers.
UPDATE WaterStation SET VerificationStatus = 'Verified', VerifiedAt = NOW() WHERE VerificationStatus = 'NotSubmitted';
