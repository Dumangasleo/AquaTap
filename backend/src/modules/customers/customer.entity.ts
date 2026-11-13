import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';

@Entity({ name: 'Customer' })
export class Customer {
  @PrimaryGeneratedColumn({ name: 'CustomerID', unsigned: true })
  customerId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'UserAccountID', type: 'int', unsigned: true, nullable: true, unique: true })
  userAccountId: number | null;

  @Column({ name: 'FullName', length: 150 })
  fullName: string;

  @Column({ name: 'Address', length: 255 })
  address: string;

  @Column({ name: 'Occupation', type: 'varchar', length: 100, nullable: true })
  occupation: string | null;

  @Column({ name: 'ContactNumber', length: 30 })
  contactNumber: string;

  @Column({ name: 'Landmark', type: 'varchar', length: 255, nullable: true })
  landmark: string | null;

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

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
