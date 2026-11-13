import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';
import { Employee } from '../employees/employee.entity';

@Entity({ name: 'EmployeeShift' })
export class EmployeeShift {
  @PrimaryGeneratedColumn({ name: 'EmployeeShiftID', unsigned: true })
  employeeShiftId: number;

  @Column({ name: 'EmployeeID', type: 'int', unsigned: true })
  employeeId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'EmployeeID' })
  employee?: Relation<Employee>;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  /** YYYY-MM-DD */
  @Column({ name: 'ShiftDate', type: 'date' })
  shiftDate: string;

  @Column({ name: 'TimeIn', type: 'datetime' })
  timeIn: Date;

  @Column({ name: 'TimeOut', type: 'datetime', nullable: true })
  timeOut: Date | null;

  @Column({ name: 'TotalDeliveredOrders', type: 'int', unsigned: true, default: 0 })
  totalDeliveredOrders: number;

  @Column({ name: 'TotalGallonsDelivered', type: 'int', unsigned: true, default: 0 })
  totalGallonsDelivered: number;

  @Column({ name: 'TotalGallonsReturned', type: 'int', unsigned: true, default: 0 })
  totalGallonsReturned: number;

  @Column({
    name: 'TotalCashSales',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  totalCashSales: number;

  @Column({
    name: 'TotalCreditSales',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  totalCreditSales: number;

  @Column({
    name: 'TotalCollections',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  totalCollections: number;

  @Column({
    name: 'TotalExpenses',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  totalExpenses: number;

  @Column({
    name: 'NetCashOnHand',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  netCashOnHand: number;

  @Column({ name: 'Remarks', type: 'varchar', length: 255, nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
