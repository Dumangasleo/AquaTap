import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'GallonContract' })
export class GallonContract {
  @PrimaryGeneratedColumn({ name: 'GallonContractID', unsigned: true })
  gallonContractId: number;

  @Column({ name: 'CustomerID', type: 'int', unsigned: true })
  customerId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'FullName', length: 150 })
  fullName: string;

  @Column({ name: 'Address', length: 255 })
  address: string;

  @Column({ name: 'Occupation', type: 'varchar', length: 100, nullable: true })
  occupation: string | null;

  @Column({ name: 'ContactNumber', length: 30 })
  contactNumber: string;

  @Column({ name: 'BorrowedGallons', type: 'int', unsigned: true })
  borrowedGallons: number;

  @Column({ name: 'ContractBody', type: 'text', nullable: true })
  contractBody: string | null;

  @Column({ name: 'SignatureSvg', type: 'mediumtext' })
  signatureSvg: string;

  @Column({ name: 'SignedAt', type: 'datetime' })
  signedAt: Date;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;
}
