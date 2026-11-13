import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountActivity } from './account-activity.entity';
import { AccountActivityService } from './account-activity.service';
import { ActivityRecordingInterceptor } from './activity-recording.interceptor';

/** Account activity log: the @RecordActivity() decorator, its interceptor and the service that stores entries. */
@Module({
  imports: [TypeOrmModule.forFeature([AccountActivity])],
  providers: [AccountActivityService, { provide: APP_INTERCEPTOR, useClass: ActivityRecordingInterceptor }],
  exports: [AccountActivityService],
})
export class AccountActivityModule {}
