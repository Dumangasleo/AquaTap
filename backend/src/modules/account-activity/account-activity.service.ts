import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { ACTIVITY_CATEGORY_BY_TYPE, ActivityType } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { currentDateTime } from '../../common/utils/date-time.util';
import { AccountActivity } from './account-activity.entity';
import {
  AccountActivityListResponse,
  AccountActivityQueryDto,
  DEFAULT_ACTIVITY_PAGE_SIZE,
} from './dto/account-activity.dto';

const MAX_DESCRIPTION_LENGTH = 255;

export interface ActivityEntry {
  userAccountId: number;
  type: ActivityType;
  /** Plain sentence shown to the user, e.g. "Signed in on Samsung SM-A546E". */
  description: string;
  waterStationId?: number | null;
  userSessionId?: number | null;
  deviceName?: string | null;
  ipAddress?: string | null;
}

/** Writes and reads the account activity log (the audit trail in Profile > Activity). */
@Injectable()
export class AccountActivityService {
  private readonly logger = new Logger(AccountActivityService.name);

  constructor(
    @InjectRepository(AccountActivity)
    private readonly accountActivityRepository: Repository<AccountActivity>,
  ) {}

  /**
   * Saves one activity. It never throws: a problem with the log must not fail
   * the action the user just did (an order, a payment, a sign-in).
   */
  async record(entry: ActivityEntry): Promise<void> {
    try {
      await this.accountActivityRepository.insert({
        userAccountId: entry.userAccountId,
        waterStationId: entry.waterStationId ?? null,
        userSessionId: entry.userSessionId ?? null,
        activityType: entry.type,
        activityCategory: ACTIVITY_CATEGORY_BY_TYPE[entry.type],
        description: entry.description.slice(0, MAX_DESCRIPTION_LENGTH),
        deviceName: entry.deviceName ?? null,
        ipAddress: entry.ipAddress ?? null,
        createdAt: currentDateTime(),
      });
    } catch (error) {
      this.logger.warn(
        `Could not record activity ${entry.type} for account ${entry.userAccountId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Shortcut for route handlers that record an activity themselves (who and which device come from `user`). */
  recordForUser(
    user: AuthenticatedUser,
    ipAddress: string | null,
    type: ActivityType,
    description: string,
  ): Promise<void> {
    return this.record({
      userAccountId: user.userAccountId,
      waterStationId: user.waterStationId,
      userSessionId: user.userSessionId,
      type,
      description,
      deviceName: user.deviceName,
      ipAddress,
    });
  }

  /** Newest first. Uses the ID as the cursor, so new activity never shifts the pages. */
  async listActivity(
    userAccountId: number,
    query: AccountActivityQueryDto,
  ): Promise<AccountActivityListResponse> {
    const pageSize = query.limit ?? DEFAULT_ACTIVITY_PAGE_SIZE;
    const where: FindOptionsWhere<AccountActivity> = { userAccountId };
    if (query.beforeId) where.accountActivityId = LessThan(String(query.beforeId));
    if (query.category) where.activityCategory = query.category;

    // One extra row tells us whether an older page exists.
    const activities = await this.accountActivityRepository.find({
      where,
      order: { accountActivityId: 'DESC' },
      take: pageSize + 1,
    });

    const pageActivities = activities.slice(0, pageSize);
    const hasOlderActivities = activities.length > pageSize;
    const oldestActivity = pageActivities.at(-1);

    return {
      items: pageActivities.map((activity) => ({
        accountActivityId: Number(activity.accountActivityId),
        activityType: activity.activityType,
        activityCategory: activity.activityCategory,
        description: activity.description,
        deviceName: activity.deviceName,
        ipAddress: activity.ipAddress,
        createdAt: activity.createdAt,
      })),
      nextBeforeId: hasOlderActivities && oldestActivity ? Number(oldestActivity.accountActivityId) : null,
    };
  }
}
