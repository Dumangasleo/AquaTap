import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DevicePlatform, SignInMethod } from '../../../common/enums/domain.enums';

/** One device where the account is signed in. The access token of that device carries this ID. */
@Entity({ name: 'UserSession' })
export class UserSession {
  @PrimaryGeneratedColumn({ name: 'UserSessionID', unsigned: true })
  userSessionId: number;

  @Column({ name: 'UserAccountID', type: 'int', unsigned: true })
  userAccountId: number;

  /** e.g. "Samsung SM-A546E" or "Chrome on Windows". */
  @Column({ name: 'DeviceName', type: 'varchar', length: 120 })
  deviceName: string;

  @Column({ name: 'DevicePlatform', type: 'enum', enum: DevicePlatform, default: DevicePlatform.Unknown })
  devicePlatform: DevicePlatform;

  @Column({ name: 'AppVersion', type: 'varchar', length: 30, nullable: true })
  appVersion: string | null;

  @Column({ name: 'IpAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'SignInMethod', type: 'enum', enum: SignInMethod })
  signInMethod: SignInMethod;

  @Column({ name: 'SignedInAt', type: 'datetime' })
  signedInAt: Date;

  @Column({ name: 'LastActiveAt', type: 'datetime' })
  lastActiveAt: Date;

  @Column({ name: 'ExpiresAt', type: 'datetime' })
  expiresAt: Date;

  /** Set when the device is signed out; the session (and its access token) stops working. */
  @Column({ name: 'SignedOutAt', type: 'datetime', nullable: true })
  signedOutAt: Date | null;
}
