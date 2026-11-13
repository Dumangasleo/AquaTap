import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { ExpenseCategory } from '../../common/enums/domain.enums';
import { decimalToNumberTransformer } from '../../common/transformers/column.transformers';
import { Employee } from '../employees/employee.entity';

@Entity({ name: 'Expense' })
export class Expense {
  @PrimaryGeneratedColumn({ name: 'ExpenseID', unsigned: true })
  expenseId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'EmployeeID', type: 'int', unsigned: true, nullable: true })
  employeeId: number | null;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'EmployeeID' })
  employee?: Relation<Employee> | null;

  @Column({ name: 'EmployeeShiftID', type: 'int', unsigned: true, nullable: true })
  employeeShiftId: number | null;

  @Column({ name: 'ExpenseCategory', type: 'enum', enum: ExpenseCategory })
  expenseCategory: ExpenseCategory;

  @Column({
    name: 'Amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  amount: number;

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description: string | null;

  /** YYYY-MM-DD */
  @Column({ name: 'ExpenseDate', type: 'date' })
  expenseDate: string;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;
}
