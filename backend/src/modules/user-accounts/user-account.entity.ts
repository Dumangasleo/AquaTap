import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../common/enums/domain.enums';

@Entity({ name: 'UserAccount' })
export class UserAccount {
  @PrimaryGeneratedColumn({ name: 'UserAccountID', unsigned: true })
  userAccountId: number;

  @Column({ name: 'Email', length: 190, unique: true })
  email: string;

  @Column({ name: 'GoogleSubject', type: 'varchar', length: 64, nullable: true, unique: true })
  googleSubject: string | null;

  @Column({ name: 'FullName', type: 'varchar', length: 150, nullable: true })
  fullName: string | null;

  @Column({ name: 'PhotoUrl', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  /** Profile photo (small JPEG data URI). Not loaded by default because it is large. */
  @Column({ name: 'AvatarImage', type: 'mediumtext', nullable: true, select: false })
  avatarImage?: string | null;

  /** scrypt hash. Not loaded by default: read it only through UserAccountsService.findWithCredentials(). */
  @Column({ name: 'PasswordHash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash?: string | null;

  @Column({ name: 'PasswordChangedAt', type: 'datetime', nullable: true })
  passwordChangedAt: Date | null;

  /** Wrong passwords / verification codes in a row (reset by a successful sign-in). */
  @Column({ name: 'FailedSignInCount', type: 'int', unsigned: true, default: 0 })
  failedSignInCount: number;

  @Column({ name: 'SignInLockedUntil', type: 'datetime', nullable: true })
  signInLockedUntil: Date | null;

  @Column({ name: 'IsTwoFactorEnabled', type: 'boolean', default: false })
  isTwoFactorEnabled: boolean;

  /** Encrypted authenticator secret. Not loaded by default (see findWithCredentials). */
  @Column({ name: 'TwoFactorSecret', type: 'varchar', length: 255, nullable: true, select: false })
  twoFactorSecret?: string | null;

  @Column({ name: 'TwoFactorEnabledAt', type: 'datetime', nullable: true })
  twoFactorEnabledAt: Date | null;

  @Column({ name: 'UserRole', type: 'enum', enum: UserRole, nullable: true })
  userRole: UserRole | null;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true, nullable: true })
  waterStationId: number | null;

  @Column({ name: 'IsActive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'LastLoginAt', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
