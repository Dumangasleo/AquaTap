import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customers/customer.entity';
import { EmployeeShift } from '../employee-shifts/employee-shift.entity';
import { GallonContractsModule } from '../gallon-contracts/gallon-contracts.module';
import { Payment } from '../payments/payment.entity';
import { WaterStationsModule } from '../water-stations/water-stations.module';
import { CustomerOrder } from './customer-order.entity';
import { CustomerOrdersController } from './customer-orders.controller';
import { CustomerOrdersService } from './customer-orders.service';
import { OrderNumberGenerator } from './order-number.generator';
import { OrderStatusPolicy } from './order-status.policy';
import { OrderWorkflowService } from './order-workflow.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerOrder, Customer, EmployeeShift, Payment]),
    GallonContractsModule,
    WaterStationsModule,
  ],
  controllers: [CustomerOrdersController],
  providers: [CustomerOrdersService, OrderWorkflowService, OrderStatusPolicy, OrderNumberGenerator],
})
export class CustomerOrdersModule {}
