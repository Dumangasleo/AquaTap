import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StationVerificationStatus, UserRole } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { normalizeFullName } from '../../common/utils/text.util';
import { Employee } from '../employees/employee.entity';
import { ContractTemplateService } from '../gallon-contracts/contract-template.service';
import { UserAccount } from '../user-accounts/user-account.entity';
import {
  ContractTemplateResponse,
  RegisterWaterStationDto,
  UpdateWaterStationDto,
  WaterStationOptionResponse,
  WaterStationResponse,
} from './dto/water-station.dto';
import { WaterStation } from './water-station.entity';

@Injectable()
export class WaterStationsService {
  constructor(
    @InjectRepository(WaterStation) private readonly waterStationRepository: Repository<WaterStation>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly contractTemplateService: ContractTemplateService,
  ) {}

  /** Stations a new customer can choose from during sign-up (KYB-verified only). */
  async listActiveStations(): Promise<WaterStationOptionResponse[]> {
    const stations = await this.waterStationRepository.find({
      where: { isActive: true, verificationStatus: StationVerificationStatus.Verified },
      order: { stationName: 'ASC' },
    });
    return stations.map((station) => ({
      waterStationId: station.waterStationId,
      stationName: station.stationName,
      address: station.address,
      contactNumber: station.contactNumber,
      pricePerGallon: station.pricePerGallon,
      latitude: station.latitude,
      longitude: station.longitude,
    }));
  }

  /** Customers can only sign up with stations that passed KYB verification. */
  async findVerifiedStationOrThrow(waterStationId: number): Promise<WaterStation> {
    const station = await this.findActiveStationOrThrow(waterStationId);
    if (station.verificationStatus !== StationVerificationStatus.Verified) {
      throw new NotFoundException(
        'This water refilling station is not verified yet. Please choose another station.',
      );
    }
    return station;
  }

  async findActiveStationOrThrow(waterStationId: number): Promise<WaterStation> {
    const station = await this.waterStationRepository.findOne({ where: { waterStationId, isActive: true } });
    if (!station) throw new NotFoundException('Water refilling station not found.');
    return station;
  }

  /** Owner onboarding: creates the station, makes the user its Admin and an (owner) Employee. */
  async registerStation(
    user: AuthenticatedUser,
    registerDto: RegisterWaterStationDto,
  ): Promise<WaterStationResponse> {
    if (user.role !== null) {
      throw new ConflictException(
        'Your account is already set up. Sign in with another Google account to register a station.',
      );
    }

    const ownerFullName = normalizeFullName(registerDto.ownerFullName);

    const station = await this.dataSource.transaction(async (manager) => {
      const newStation = await manager.save(
        manager.create(WaterStation, {
          stationName: registerDto.stationName.trim(),
          address: registerDto.address.trim(),
          contactNumber: registerDto.contactNumber.trim(),
          pricePerGallon: registerDto.pricePerGallon,
          latitude: registerDto.latitude ?? null,
          longitude: registerDto.longitude ?? null,
          contractTemplate: null,
          isActive: true,
        }),
      );

      await manager.save(
        manager.create(Employee, {
          waterStationId: newStation.waterStationId,
          userAccountId: user.userAccountId,
          fullName: ownerFullName,
          email: user.email,
          contactNumber: registerDto.contactNumber.trim(),
          isOwner: true,
          isActive: true,
        }),
      );

      await manager.update(UserAccount, user.userAccountId, {
        userRole: UserRole.Admin,
        waterStationId: newStation.waterStationId,
        fullName: ownerFullName,
      });

      return newStation;
    });

    return this.toResponse(station);
  }

  async getStation(waterStationId: number): Promise<WaterStationResponse> {
    return this.toResponse(await this.findActiveStationOrThrow(waterStationId));
  }

  async updateStation(
    waterStationId: number,
    updateDto: UpdateWaterStationDto,
  ): Promise<WaterStationResponse> {
    const station = await this.findActiveStationOrThrow(waterStationId);

    if (updateDto.stationName !== undefined) station.stationName = updateDto.stationName.trim();
    if (updateDto.address !== undefined) station.address = updateDto.address.trim();
    if (updateDto.contactNumber !== undefined) station.contactNumber = updateDto.contactNumber.trim();
    if (updateDto.pricePerGallon !== undefined) station.pricePerGallon = updateDto.pricePerGallon;
    if (updateDto.latitude !== undefined) station.latitude = updateDto.latitude;
    if (updateDto.longitude !== undefined) station.longitude = updateDto.longitude;
    if (updateDto.contractTemplate !== undefined) {
      station.contractTemplate = updateDto.contractTemplate.trim() ? updateDto.contractTemplate : null;
    }

    return this.toResponse(await this.waterStationRepository.save(station));
  }

  async getContractTemplate(waterStationId: number): Promise<ContractTemplateResponse> {
    const station = await this.findActiveStationOrThrow(waterStationId);
    return {
      waterStationId: station.waterStationId,
      stationName: station.stationName,
      contractTemplate: this.contractTemplateService.resolveTemplate(station.contractTemplate),
    };
  }

  private toResponse(station: WaterStation): WaterStationResponse {
    return {
      waterStationId: station.waterStationId,
      stationName: station.stationName,
      address: station.address,
      contactNumber: station.contactNumber,
      pricePerGallon: station.pricePerGallon,
      latitude: station.latitude,
      longitude: station.longitude,
      contractTemplate: this.contractTemplateService.resolveTemplate(station.contractTemplate),
      usesDefaultContractTemplate: !station.contractTemplate,
      verificationStatus: station.verificationStatus,
      verificationRemarks: station.verificationRemarks,
    };
  }
}
