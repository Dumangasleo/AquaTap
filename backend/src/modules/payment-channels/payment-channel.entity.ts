import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentChannelType } from '../../common/enums/domain.enums';

@Entity({ name: 'PaymentChannel' })
export class PaymentChannel {
  @PrimaryGeneratedColumn({ name: 'PaymentChannelID', unsigned: true })
  paymentChannelId: number;

  @Column({ name: 'WaterStationID', type: 'int', unsigned: true })
  waterStationId: number;

  @Column({ name: 'ChannelType', type: 'enum', enum: PaymentChannelType })
  channelType: PaymentChannelType;

  @Column({ name: 'ChannelName', length: 100 })
  channelName: string;

  @Column({ name: 'AccountName', length: 150 })
  accountName: string;

  @Column({ name: 'AccountNumber', length: 60 })
  accountNumber: string;

  @Column({ name: 'QrImage', type: 'mediumtext', nullable: true })
  qrImage: string | null;

  @Column({ name: 'IsActive', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;
}
