import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StationDocumentType } from '../../common/enums/domain.enums';

/** One KYB file of a station (one file per document type; uploading again replaces it). */
@Entity({ name: 'StationDocument' })
export class StationDocument {
  @PrimaryGeneratedColumn({ name: 'StationDocumentID', unsigned: true })
  stationDocumentId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'DocumentType', type: 'enum', enum: StationDocumentType })
  documentType: StationDocumentType;

  @Column({ name: 'FileName', length: 150 })
  fileName: string;

  @Column({ name: 'MimeType', length: 60 })
  mimeType: string;

  @Column({ name: 'FileSizeBytes', type: 'int', unsigned: true })
  fileSizeBytes: number;

  /** Data URI. Not selected by default because it is large; load it only when viewing the file. */
  @Column({ name: 'FileData', type: 'mediumtext', select: false })
  fileData: string;

  @Column({ name: 'UploadedAt', type: 'datetime' })
  uploadedAt: Date;
}
