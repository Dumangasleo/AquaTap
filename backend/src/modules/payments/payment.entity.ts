import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { PaymentMode } from '../../common/enums/domain.enums';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';
import { CustomerOrder } from '../customer-orders/customer-order.entity';

@Entity({ name: 'Payment' })
export class Payment {
  @PrimaryGeneratedColumn({ name: 'PaymentID', unsigned: true })
  paymentId: number;

  @Column({ name: 'CustomerOrderID', type: 'int', unsigned: true })
  customerOrderId: number;

  @ManyToOne(() => CustomerOrder)
  @JoinColumn({ name: 'CustomerOrderID' })
  customerOrder?: Relation<CustomerOrder>;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'CustomerID', type: 'int', unsigned: true })
  customerId: number;

  @Column({ name: 'EmployeeID', type: 'int', unsigned: true, nullable: true })
  employeeId: number | null;

  @Column({
    name: 'AmountPaid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  amountPaid: number;

  @Column({ name: 'PaymentMode', type: 'enum', enum: PaymentMode })
  paymentMode: PaymentMode;

  @Column({ name: 'ReferenceNumber', type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ name: 'PaidAt', type: 'datetime' })
  paidAt: Date;

  @Column({ name: 'Remarks', type: 'varchar', length: 255, nullable: true })
  remarks: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;
}
