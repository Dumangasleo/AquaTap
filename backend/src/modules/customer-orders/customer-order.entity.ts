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
import { OrderStatus, PaymentMode, PaymentStatus, PaymentType } from '../../common/enums/domain.enums';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';
import { Customer } from '../customers/customer.entity';
import { Employee } from '../employees/employee.entity';

@Entity({ name: 'CustomerOrder' })
export class CustomerOrder {
  @PrimaryGeneratedColumn({ name: 'CustomerOrderID', unsigned: true })
  customerOrderId: number;

  @Column({ name: 'OrderNumber', length: 30, unique: true })
  orderNumber: string;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'CustomerID', type: 'int', unsigned: true })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'CustomerID' })
  customer?: Relation<Customer>;

  @Column({ name: 'EmployeeID', type: 'int', unsigned: true, nullable: true })
  employeeId: number | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'EmployeeID' })
  employee?: Relation<Employee> | null;

  @Column({ name: 'EmployeeShiftID', type: 'int', unsigned: true, nullable: true })
  employeeShiftId: number | null;

  @Column({ name: 'GallonsOrdered', type: 'int', unsigned: true })
  gallonsOrdered: number;

  @Column({ name: 'ReturnedGallons', type: 'int', unsigned: true, default: 0 })
  returnedGallons: number;

  @Column({
    name: 'PricePerGallon',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  pricePerGallon: number;

  @Column({
    name: 'TotalAmount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  totalAmount: number;

  @Column({ name: 'PaymentType', type: 'enum', enum: PaymentType })
  paymentType: PaymentType;

  @Column({ name: 'PaymentMode', type: 'enum', enum: PaymentMode, nullable: true })
  paymentMode: PaymentMode | null;

  @Column({ name: 'PaymentStatus', type: 'enum', enum: PaymentStatus, default: PaymentStatus.Unpaid })
  paymentStatus: PaymentStatus;

  @Column({ name: 'PaymentReference', type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  @Column({ name: 'DeliveryAddress', length: 255 })
  deliveryAddress: string;

  @Column({
    name: 'DeliveryLatitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  deliveryLatitude: number | null;

  @Column({
    name: 'DeliveryLongitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  deliveryLongitude: number | null;

  @Column({ name: 'CustomerNotes', type: 'varchar', length: 500, nullable: true })
  customerNotes: string | null;

  @Column({ name: 'OrderStatus', type: 'enum', enum: OrderStatus, default: OrderStatus.Pending })
  orderStatus: OrderStatus;

  @Column({ name: 'StatusReason', type: 'varchar', length: 255, nullable: true })
  statusReason: string | null;

  @Column({ name: 'OrderedAt', type: 'datetime' })
  orderedAt: Date;

  @Column({ name: 'AcceptedAt', type: 'datetime', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'DeliveredAt', type: 'datetime', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'ClosedAt', type: 'datetime', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'PaidAt', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
