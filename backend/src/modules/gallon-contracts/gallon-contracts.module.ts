import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractTemplateService } from './contract-template.service';
import { GallonContract } from './gallon-contract.entity';
import { GallonLedgerService } from './gallon-ledger.service';

@Module({
  imports: [TypeOrmModule.forFeature([GallonContract])],
  providers: [ContractTemplateService, GallonLedgerService],
  exports: [ContractTemplateService, GallonLedgerService, TypeOrmModule],
})
export class GallonContractsModule {}
