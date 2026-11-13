import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';

@Entity({ name: 'Employee' })
export class Employee {
  @PrimaryGeneratedColumn({ name: 'EmployeeID', unsigned: true })
  employeeId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'UserAccountID', type: 'int', unsigned: true, nullable: true, unique: true })
  userAccountId: number | null;

  @Column({ name: 'FullName', length: 150 })
  fullName: string;

  @Column({ name: 'Email', length: 190, unique: true })
  email: string;

  @Column({ name: 'ContactNumber', type: 'varchar', length: 30, nullable: true })
  contactNumber: string | null;

  @Column({ name: 'IsOwner', type: 'boolean', default: false })
  isOwner: boolean;

  @Column({ name: 'IsActive', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'LastLatitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  lastLatitude: number | null;

  @Column({
    name: 'LastLongitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  lastLongitude: number | null;

  @Column({ name: 'LastLocationAt', type: 'datetime', nullable: true })
  lastLocationAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
