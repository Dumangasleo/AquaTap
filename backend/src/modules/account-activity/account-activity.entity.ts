import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ActivityCategory, ActivityType } from '../../common/enums/domain.enums';

/** One line of the account's history: who did what, when, and on which device. */
@Entity({ name: 'AccountActivity' })
export class AccountActivity {
  // BIGINT comes back from MySQL as text; the list endpoint converts it to a number.
  @PrimaryGeneratedColumn({ name: 'AccountActivityID', type: 'bigint', unsigned: true })
  accountActivityId: string;

  @Column({ name: 'UserAccountID', type: 'int', unsigned: true })
  userAccountId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true, nullable: true })
  waterStationId: number | null;

  @Column({ name: 'UserSessionID', type: 'int', unsigned: true, nullable: true })
  userSessionId: number | null;

  @Column({ name: 'ActivityType', type: 'varchar', length: 50 })
  activityType: ActivityType;

  @Column({ name: 'ActivityCategory', type: 'enum', enum: ActivityCategory })
  activityCategory: ActivityCategory;

  @Column({ name: 'Description', type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'DeviceName', type: 'varchar', length: 120, nullable: true })
  deviceName: string | null;

  @Column({ name: 'IpAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;
}
