import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { StationVerificationStatus } from '../../common/enums/domain.enums';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';

@Entity({ name: 'WaterStation' })
export class WaterStation {
  @PrimaryGeneratedColumn({ name: 'WaterStationID', unsigned: true })
  waterStationId: number;

  @Column({ name: 'StationName', length: 120 })
  stationName: string;

  @Column({ name: 'RegisteredBusinessName', type: 'varchar', length: 150, nullable: true })
  registeredBusinessName: string | null;

  @Column({ name: 'TaxIdentificationNumber', type: 'varchar', length: 20, nullable: true })
  taxIdentificationNumber: string | null;

  @Column({ name: 'Address', length: 255 })
  address: string;

  @Column({ name: 'ContactNumber', length: 30 })
  contactNumber: string;

  @Column({
    name: 'Latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  latitude: number | null;

  @Column({
    name: 'Longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  longitude: number | null;

  @Column({
    name: 'PricePerGallon',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  pricePerGallon: number;

  @Column({ name: 'ContractTemplate', type: 'text', nullable: true })
  contractTemplate: string | null;

  @Column({
    name: 'VerificationStatus',
    type: 'enum',
    enum: StationVerificationStatus,
    default: StationVerificationStatus.NotSubmitted,
  })
  verificationStatus: StationVerificationStatus;

  @Column({ name: 'VerificationRemarks', type: 'varchar', length: 255, nullable: true })
  verificationRemarks: string | null;

  @Column({ name: 'VerificationSubmittedAt', type: 'datetime', nullable: true })
  verificationSubmittedAt: Date | null;

  @Column({ name: 'VerifiedAt', type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'IsActive', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
