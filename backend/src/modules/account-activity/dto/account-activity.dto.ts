import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ActivityCategory, ActivityType } from '../../../common/enums/domain.enums';

export const DEFAULT_ACTIVITY_PAGE_SIZE = 30;
export const MAX_ACTIVITY_PAGE_SIZE = 100;

export class AccountActivityQueryDto {
  /** How many entries to return (1-100, default 30). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ACTIVITY_PAGE_SIZE)
  limit?: number;

  /** Load older entries: pass the `nextBeforeId` of the previous page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  beforeId?: number;

  @IsOptional()
  @IsEnum(ActivityCategory, {
    message: 'category must be Security, Profile, Orders, Payments, Shift or Station.',
  })
  category?: ActivityCategory;
}

export class AccountActivityResponse {
  accountActivityId: number;
  activityType: ActivityType;
  activityCategory: ActivityCategory;
  /** Plain sentence, e.g. "Placed order AQ261110-AB12 for 3 gallons". */
  description: string;
  deviceName: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export class AccountActivityListResponse {
  /** Newest first. */
  items: AccountActivityResponse[];
  /** Pass as `beforeId` to load the next (older) page. null = no more entries. */
  nextBeforeId: number | null;
}
