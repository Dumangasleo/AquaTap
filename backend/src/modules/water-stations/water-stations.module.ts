import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GallonContractsModule } from '../gallon-contracts/gallon-contracts.module';
import { WaterStation } from './water-station.entity';
import { WaterStationsController } from './water-stations.controller';
import { WaterStationsService } from './water-stations.service';

@Module({
  imports: [TypeOrmModule.forFeature([WaterStation]), GallonContractsModule],
  controllers: [WaterStationsController],
  providers: [WaterStationsService],
  exports: [WaterStationsService],
})
export class WaterStationsModule {}
