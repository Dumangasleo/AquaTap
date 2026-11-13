import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/employee.entity';
import { WaterStation } from '../water-stations/water-station.entity';
import { ProfileService } from './profile.service';
import { UserAccount } from './user-account.entity';
import { UserAccountsService } from './user-accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAccount, Employee, WaterStation])],
  providers: [UserAccountsService, ProfileService],
  exports: [UserAccountsService, ProfileService],
})
export class UserAccountsModule {}
