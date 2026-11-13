import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaterStation } from '../water-stations/water-station.entity';
import { ProfileResponse } from './dto/profile.dto';
import { UserAccountsService } from './user-accounts.service';

/** The single place that builds the profile the app shows after sign-in and on the Profile screen. */
@Injectable()
export class ProfileService {
  constructor(
    private readonly userAccountsService: UserAccountsService,
    @InjectRepository(WaterStation) private readonly waterStationRepository: Repository<WaterStation>,
  ) {}

  /** @param currentSessionId the device session asking for the profile (null when there is none yet). */
  async getProfile(userAccountId: number, currentSessionId: number | null): Promise<ProfileResponse> {
    const account = await this.userAccountsService.findById(userAccountId);
    if (!account) throw new UnauthorizedException('Account not found.');
    await this.userAccountsService.applyAutomaticRole(account);

    const [accountAccess, profileDetails] = await Promise.all([
      this.userAccountsService.resolveAccountAccess(userAccountId),
      this.userAccountsService.getProfileDetails(userAccountId),
    ]);
    if (!accountAccess) {
      throw new UnauthorizedException('Your account is disabled. Please contact the station.');
    }

    const waterStation = accountAccess.waterStationId
      ? await this.waterStationRepository.findOne({ where: { waterStationId: accountAccess.waterStationId } })
      : null;

    return {
      userAccountId: accountAccess.userAccountId,
      email: accountAccess.email,
      fullName: accountAccess.fullName,
      photoUrl: account.photoUrl,
      avatarImage: profileDetails.avatarImage,
      hasPassword: profileDetails.hasPassword,
      isTwoFactorEnabled: account.isTwoFactorEnabled,
      currentSessionId,
      role: accountAccess.role,
      employeeId: accountAccess.employeeId,
      customerId: accountAccess.customerId,
      isOwner: accountAccess.isOwner,
      needsOnboarding: accountAccess.role === null,
      waterStation: waterStation
        ? {
            waterStationId: waterStation.waterStationId,
            stationName: waterStation.stationName,
            address: waterStation.address,
            contactNumber: waterStation.contactNumber,
            pricePerGallon: waterStation.pricePerGallon,
            latitude: waterStation.latitude,
            longitude: waterStation.longitude,
            verificationStatus: waterStation.verificationStatus,
          }
        : null,
    };
  }
}
