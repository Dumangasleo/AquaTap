import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Not, Repository } from 'typeorm';
import { DeviceInfoDto } from '../../../common/dto/device-info.dto';
import { DevicePlatform, SignInMethod } from '../../../common/enums/domain.enums';
import { currentDateTime } from '../../../common/utils/date-time.util';
import { AppConfig } from '../../../config/app-config';
import { SessionResponse } from '../dto/account-security.dto';
import { UserSession } from './user-session.entity';

const UNKNOWN_DEVICE_NAME = 'Unknown device';
/** "Last active" is refreshed at most this often, so normal requests do not write to the database. */
const LAST_ACTIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface StartSessionInput {
  userAccountId: number;
  signInMethod: SignInMethod;
  /** Missing when an old app version signs in: the device is then listed as "Unknown device". */
  device: DeviceInfoDto | undefined;
  ipAddress: string | null;
}

/** Device sessions: where the account is signed in, and signing devices out. */
@Injectable()
export class UserSessionsService {
  constructor(
    @InjectRepository(UserSession) private readonly userSessionRepository: Repository<UserSession>,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /** Starts a session that lasts as long as the access token (JWT_EXPIRES_IN_DAYS). */
  startSession({ userAccountId, signInMethod, device, ipAddress }: StartSessionInput): Promise<UserSession> {
    const signedInAt = currentDateTime();
    const sessionSeconds = this.configService.get('auth.jwtExpiresInSeconds', { infer: true });

    return this.userSessionRepository.save(
      this.userSessionRepository.create({
        userAccountId,
        deviceName: device?.deviceName.trim() || UNKNOWN_DEVICE_NAME,
        devicePlatform: device?.platform ?? DevicePlatform.Unknown,
        appVersion: device?.appVersion?.trim() || null,
        ipAddress,
        signInMethod,
        signedInAt,
        lastActiveAt: signedInAt,
        expiresAt: new Date(signedInAt.getTime() + sessionSeconds * 1000),
        signedOutAt: null,
      }),
    );
  }

  findActiveSession(userAccountId: number, userSessionId: number): Promise<UserSession | null> {
    return this.userSessionRepository.findOne({
      where: { userSessionId, userAccountId, signedOutAt: IsNull(), expiresAt: MoreThan(currentDateTime()) },
    });
  }

  /** Devices that are signed in right now: this device first, then the most recently used. */
  async listActiveSessions(userAccountId: number, currentSessionId: number): Promise<SessionResponse[]> {
    const sessions = await this.userSessionRepository.find({
      where: { userAccountId, signedOutAt: IsNull(), expiresAt: MoreThan(currentDateTime()) },
      order: { lastActiveAt: 'DESC', userSessionId: 'DESC' },
    });

    return sessions
      .map((session) => this.toResponse(session, currentSessionId))
      .sort((first, second) => Number(second.isCurrent) - Number(first.isCurrent));
  }

  /** Signs out one device. Returns the ended session (e.g. to name the device in the activity log). */
  async endSession(userAccountId: number, userSessionId: number): Promise<UserSession> {
    const session = await this.findActiveSession(userAccountId, userSessionId);
    if (!session) throw new NotFoundException('That device is already signed out.');

    session.signedOutAt = currentDateTime();
    return this.userSessionRepository.save(session);
  }

  /** Signs out every device except the one that is asking. Returns how many were signed out. */
  async endOtherSessions(userAccountId: number, currentSessionId: number): Promise<number> {
    const result = await this.userSessionRepository.update(
      {
        userAccountId,
        userSessionId: Not(currentSessionId),
        signedOutAt: IsNull(),
        expiresAt: MoreThan(currentDateTime()),
      },
      { signedOutAt: currentDateTime() },
    );
    return result.affected ?? 0;
  }

  /** Keeps "last active" fresh without writing on every request. */
  async refreshLastActive(
    userSessionId: number,
    lastActiveAt: Date,
    ipAddress: string | null,
  ): Promise<void> {
    const now = currentDateTime();
    if (now.getTime() - lastActiveAt.getTime() < LAST_ACTIVE_REFRESH_INTERVAL_MS) return;

    // The condition keeps two requests arriving together from both writing.
    const staleBefore = new Date(now.getTime() - LAST_ACTIVE_REFRESH_INTERVAL_MS);
    await this.userSessionRepository.update(
      { userSessionId, lastActiveAt: LessThanOrEqual(staleBefore) },
      { lastActiveAt: now, ...(ipAddress ? { ipAddress } : {}) },
    );
  }

  private toResponse(session: UserSession, currentSessionId: number): SessionResponse {
    return {
      userSessionId: session.userSessionId,
      deviceName: session.deviceName,
      platform: session.devicePlatform,
      appVersion: session.appVersion,
      ipAddress: session.ipAddress,
      signInMethod: session.signInMethod,
      signedInAt: session.signedInAt,
      lastActiveAt: session.lastActiveAt,
      isCurrent: session.userSessionId === currentSessionId,
    };
  }
}
