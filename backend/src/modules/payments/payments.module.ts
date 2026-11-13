import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerOrder } from '../customer-orders/customer-order.entity';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { Payment } from './payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, CustomerOrder])],
  controllers: [CreditsController],
  providers: [CreditsService],
})
export class PaymentsModule {}
