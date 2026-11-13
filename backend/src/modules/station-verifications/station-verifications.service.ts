import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { REQUIRED_STATION_DOCUMENT_TYPES, StationVerificationStatus } from '../../common/enums/domain.enums';
import { currentDateTime } from '../../common/utils/date-time.util';
import { Employee } from '../employees/employee.entity';
import { WaterStation } from '../water-stations/water-station.entity';
import {
  RejectStationDto,
  StationDocumentFileResponse,
  StationDocumentResponse,
  StationVerificationResponse,
  UpdateBusinessInfoDto,
  UploadStationDocumentDto,
} from './dto/station-verification.dto';
import { StationDocument } from './station-document.entity';

/** The owner can change documents only before submitting, or after a rejection. */
const EDITABLE_STATUSES: readonly StationVerificationStatus[] = [
  StationVerificationStatus.NotSubmitted,
  StationVerificationStatus.Rejected,
];

/**
 * KYB (Know Your Business) of water refilling stations.
 *   Owner:      business info + documents -> submit (UnderReview)
 *   SystemAdmin: approve (Verified, visible to customers) or reject with remarks (Rejected -> owner fixes & resubmits)
 */
@Injectable()
export class StationVerificationsService {
  constructor(
    @InjectRepository(WaterStation) private readonly waterStationRepository: Repository<WaterStation>,
    @InjectRepository(StationDocument)
    private readonly stationDocumentRepository: Repository<StationDocument>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  // ----- Owner (station admin) -----

  async getVerification(waterStationId: number): Promise<StationVerificationResponse> {
    const station = await this.findStationOrThrow(waterStationId);
    return this.toResponse(station);
  }

  async updateBusinessInfo(
    waterStationId: number,
    businessInfoDto: UpdateBusinessInfoDto,
  ): Promise<StationVerificationResponse> {
    const station = await this.findEditableStationOrThrow(waterStationId);
    station.registeredBusinessName = businessInfoDto.registeredBusinessName.trim().toUpperCase();
    station.taxIdentificationNumber = businessInfoDto.taxIdentificationNumber.trim();
    return this.toResponse(await this.waterStationRepository.save(station));
  }

  /** Saves a document; uploading the same type again replaces the old file. */
  async uploadDocument(
    waterStationId: number,
    uploadDto: UploadStationDocumentDto,
  ): Promise<StationDocumentResponse> {
    await this.findEditableStationOrThrow(waterStationId);
    const mimeType = uploadDto.fileData.slice(5, uploadDto.fileData.indexOf(';'));
    const base64Length = uploadDto.fileData.length - uploadDto.fileData.indexOf(',') - 1;

    const existingDocument = await this.stationDocumentRepository.findOne({
      where: { waterStationId, documentType: uploadDto.documentType },
    });
    const document = this.stationDocumentRepository.create({
      stationDocumentId: existingDocument?.stationDocumentId,
      waterStationId,
      documentType: uploadDto.documentType,
      fileName: uploadDto.fileName.trim(),
      mimeType,
      fileSizeBytes: Math.floor((base64Length * 3) / 4),
      fileData: uploadDto.fileData,
      uploadedAt: currentDateTime(),
    });
    const savedDocument = await this.stationDocumentRepository.save(document);
    return this.toDocumentResponse(savedDocument);
  }

  async deleteDocument(waterStationId: number, stationDocumentId: number): Promise<void> {
    await this.findEditableStationOrThrow(waterStationId);
    const result = await this.stationDocumentRepository.delete({ stationDocumentId, waterStationId });
    if (!result.affected) throw new NotFoundException('Document not found.');
  }

  async getDocumentFile(
    waterStationId: number,
    stationDocumentId: number,
  ): Promise<StationDocumentFileResponse> {
    const document = await this.stationDocumentRepository
      .createQueryBuilder('stationDocument')
      .addSelect('stationDocument.fileData')
      .where('stationDocument.stationDocumentId = :stationDocumentId', { stationDocumentId })
      .andWhere('stationDocument.waterStationId = :waterStationId', { waterStationId })
      .getOne();
    if (!document) throw new NotFoundException('Document not found.');
    return { ...this.toDocumentResponse(document), fileData: document.fileData };
  }

  async submitForReview(waterStationId: number): Promise<StationVerificationResponse> {
    const station = await this.findEditableStationOrThrow(waterStationId);
    if (!station.registeredBusinessName || !station.taxIdentificationNumber) {
      throw new BadRequestException('Please enter the registered business name and TIN first.');
    }
    const missingDocumentTypes = await this.findMissingDocumentTypes(waterStationId);
    if (missingDocumentTypes.length > 0) {
      throw new BadRequestException(
        `Please upload all required documents first (${missingDocumentTypes.length} missing).`,
      );
    }

    station.verificationStatus = StationVerificationStatus.UnderReview;
    station.verificationSubmittedAt = currentDateTime();
    station.verificationRemarks = null;
    return this.toResponse(await this.waterStationRepository.save(station));
  }

  // ----- AquaTap reviewer (SystemAdmin) -----

  async listStationsForReview(
    verificationStatus?: StationVerificationStatus,
  ): Promise<StationVerificationResponse[]> {
    const stations = await this.waterStationRepository.find({
      where: verificationStatus ? { verificationStatus } : {},
      order: { verificationSubmittedAt: 'ASC', createdAt: 'DESC' },
    });
    return Promise.all(stations.map((station) => this.toResponse(station)));
  }

  async approveStation(waterStationId: number): Promise<StationVerificationResponse> {
    const station = await this.findStationOrThrow(waterStationId);
    if (station.verificationStatus !== StationVerificationStatus.UnderReview) {
      throw new BadRequestException('Only stations under review can be approved.');
    }
    station.verificationStatus = StationVerificationStatus.Verified;
    station.verifiedAt = currentDateTime();
    station.verificationRemarks = null;
    return this.toResponse(await this.waterStationRepository.save(station));
  }

  /** Rejecting a verified station also hides it from new customers until it is fixed. */
  async rejectStation(
    waterStationId: number,
    rejectDto: RejectStationDto,
  ): Promise<StationVerificationResponse> {
    const station = await this.findStationOrThrow(waterStationId);
    const reviewableStatuses = [StationVerificationStatus.UnderReview, StationVerificationStatus.Verified];
    if (!reviewableStatuses.includes(station.verificationStatus)) {
      throw new BadRequestException('Only submitted or verified stations can be rejected.');
    }
    station.verificationStatus = StationVerificationStatus.Rejected;
    station.verificationRemarks = rejectDto.remarks.trim();
    station.verifiedAt = null;
    return this.toResponse(await this.waterStationRepository.save(station));
  }

  // ----- Helpers -----

  private async findStationOrThrow(waterStationId: number): Promise<WaterStation> {
    const station = await this.waterStationRepository.findOne({ where: { waterStationId } });
    if (!station) throw new NotFoundException('Water refilling station not found.');
    return station;
  }

  private async findEditableStationOrThrow(waterStationId: number): Promise<WaterStation> {
    const station = await this.findStationOrThrow(waterStationId);
    if (!EDITABLE_STATUSES.includes(station.verificationStatus)) {
      throw new BadRequestException(
        station.verificationStatus === StationVerificationStatus.Verified
          ? 'Your station is already verified.'
          : 'Your documents are being reviewed. You can edit them again if the review asks for changes.',
      );
    }
    return station;
  }

  private async findMissingDocumentTypes(waterStationId: number) {
    const uploadedDocuments = await this.stationDocumentRepository.find({
      where: { waterStationId, documentType: In([...REQUIRED_STATION_DOCUMENT_TYPES]) },
    });
    const uploadedTypes = new Set(uploadedDocuments.map((document) => document.documentType));
    return REQUIRED_STATION_DOCUMENT_TYPES.filter((documentType) => !uploadedTypes.has(documentType));
  }

  private async toResponse(station: WaterStation): Promise<StationVerificationResponse> {
    const [documents, owner] = await Promise.all([
      this.stationDocumentRepository.find({
        where: { waterStationId: station.waterStationId },
        order: { uploadedAt: 'ASC' },
      }),
      this.employeeRepository.findOne({ where: { waterStationId: station.waterStationId, isOwner: true } }),
    ]);
    const uploadedTypes = new Set(documents.map((document) => document.documentType));

    return {
      waterStationId: station.waterStationId,
      stationName: station.stationName,
      registeredBusinessName: station.registeredBusinessName,
      taxIdentificationNumber: station.taxIdentificationNumber,
      address: station.address,
      contactNumber: station.contactNumber,
      verificationStatus: station.verificationStatus,
      verificationRemarks: station.verificationRemarks,
      verificationSubmittedAt: station.verificationSubmittedAt,
      verifiedAt: station.verifiedAt,
      ownerFullName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      requiredDocumentTypes: [...REQUIRED_STATION_DOCUMENT_TYPES],
      missingDocumentTypes: REQUIRED_STATION_DOCUMENT_TYPES.filter(
        (documentType) => !uploadedTypes.has(documentType),
      ),
      documents: documents.map((document) => this.toDocumentResponse(document)),
      isEditable: EDITABLE_STATUSES.includes(station.verificationStatus),
      createdAt: station.createdAt,
    };
  }

  private toDocumentResponse(document: StationDocument): StationDocumentResponse {
    return {
      stationDocumentId: document.stationDocumentId,
      documentType: document.documentType,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSizeBytes: document.fileSizeBytes,
      uploadedAt: document.uploadedAt,
    };
  }
}
