import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from './common/decorators/auth.decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Used by the mobile app to check if it can reach the API. */
  @Public()
  @Get()
  async getHealth(): Promise<{ status: string; database: string; serverTime: Date }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'connected', serverTime: new Date() };
  }
}
