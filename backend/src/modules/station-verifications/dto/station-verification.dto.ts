import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { StationDocumentType, StationVerificationStatus } from '../../../common/enums/domain.enums';

/** JPEG / PNG / WEBP photo of the document, or a PDF, as a data URI (about 4 MB max). */
const DOCUMENT_DATA_URI_PATTERN = /^data:(image\/(png|jpe?g|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/;
export const MAX_DOCUMENT_DATA_URI_LENGTH = 6_000_000;

export class UpdateBusinessInfoDto {
  /** Name exactly as written on the BIR / DTI / SEC registration. */
  @IsString()
  @MinLength(3, { message: 'Please enter the registered business name.' })
  @MaxLength(150)
  registeredBusinessName: string;

  /** BIR TIN, e.g. 123-456-789-000 */
  @Matches(/^\d{3}-?\d{3}-?\d{3}(-?\d{3,5})?$/, {
    message: 'Please enter a valid TIN (e.g. 123-456-789-000).',
  })
  taxIdentificationNumber: string;
}

export class UploadStationDocumentDto {
  @IsEnum(StationDocumentType)
  documentType: StationDocumentType;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fileName: string;

  @IsString()
  @MaxLength(MAX_DOCUMENT_DATA_URI_LENGTH, {
    message: 'The file is too big. Please upload a photo below 4 MB.',
  })
  @Matches(DOCUMENT_DATA_URI_PATTERN, { message: 'Upload a photo (JPG / PNG) or a PDF of the document.' })
  fileData: string;
}

export class RejectStationDto {
  /** Shown to the station owner, e.g. "Sanitary permit is expired". */
  @IsString()
  @MinLength(5, { message: 'Please tell the owner what to fix.' })
  @MaxLength(255)
  remarks: string;
}

export class StationReviewQueryDto {
  @IsOptional()
  @IsEnum(StationVerificationStatus)
  verificationStatus?: StationVerificationStatus;
}

export class StationDocumentResponse {
  stationDocumentId: number;
  documentType: StationDocumentType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: Date;
}

export class StationDocumentFileResponse extends StationDocumentResponse {
  fileData: string;
}

export class StationVerificationResponse {
  waterStationId: number;
  stationName: string;
  registeredBusinessName: string | null;
  taxIdentificationNumber: string | null;
  address: string;
  contactNumber: string;
  verificationStatus: StationVerificationStatus;
  verificationRemarks: string | null;
  verificationSubmittedAt: Date | null;
  verifiedAt: Date | null;
  ownerFullName: string | null;
  ownerEmail: string | null;
  requiredDocumentTypes: StationDocumentType[];
  missingDocumentTypes: StationDocumentType[];
  documents: StationDocumentResponse[];
  /** true when the owner may still upload / replace documents. */
  isEditable: boolean;
  createdAt: Date;
}
