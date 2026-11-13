import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/employee.entity';
import { WaterStation } from '../water-stations/water-station.entity';
import { StationDocument } from './station-document.entity';
import { StationReviewsController, StationVerificationController } from './station-verifications.controller';
import { StationVerificationsService } from './station-verifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([StationDocument, WaterStation, Employee])],
  controllers: [StationVerificationController, StationReviewsController],
  providers: [StationVerificationsService],
})
export class StationVerificationsModule {}
