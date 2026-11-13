import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A backup code for two-step verification. Each code works once; only its keyed hash is stored. */
@Entity({ name: 'TwoFactorRecoveryCode' })
export class TwoFactorRecoveryCode {
  @PrimaryGeneratedColumn({ name: 'TwoFactorRecoveryCodeID', unsigned: true })
  twoFactorRecoveryCodeId: number;

  @Column({ name: 'UserAccountID', type: 'int', unsigned: true })
  userAccountId: number;

  @Column({ name: 'CodeHash', type: 'char', length: 64 })
  codeHash: string;

  @Column({ name: 'UsedAt', type: 'datetime', nullable: true })
  usedAt: Date | null;

  @Column({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;
}
