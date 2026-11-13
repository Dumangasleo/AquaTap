import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import {
  ContractTemplateResponse,
  RegisterWaterStationDto,
  UpdateWaterStationDto,
  WaterStationOptionResponse,
  WaterStationResponse,
} from './dto/water-station.dto';
import { WaterStationsService } from './water-stations.service';

@ApiTags('Water Stations')
@ApiBearerAuth()
@Controller('water-stations')
export class WaterStationsController {
  constructor(private readonly waterStationsService: WaterStationsService) {}

  @Get()
  listStations(): Promise<WaterStationOptionResponse[]> {
    return this.waterStationsService.listActiveStations();
  }

  @Post()
  @RecordActivity<WaterStationResponse>({
    type: ActivityType.StationRegistered,
    describe: ({ result }) => `Registered the station ${result.stationName}`,
  })
  registerStation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() registerDto: RegisterWaterStationDto,
  ): Promise<WaterStationResponse> {
    return this.waterStationsService.registerStation(user, registerDto);
  }

  @Get('mine')
  getMyStation(@CurrentUser() user: AuthenticatedUser): Promise<WaterStationResponse> {
    return this.waterStationsService.getStation(requireWaterStationId(user));
  }

  @Roles(UserRole.Admin)
  @Patch('mine')
  @RecordActivity<WaterStationResponse>({
    type: ActivityType.StationUpdated,
    describe: ({ result }) => `Updated the details of ${result.stationName}`,
  })
  updateMyStation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateWaterStationDto,
  ): Promise<WaterStationResponse> {
    return this.waterStationsService.updateStation(requireWaterStationId(user), updateDto);
  }

  @Get(':waterStationId/contract-template')
  getContractTemplate(
    @Param('waterStationId', ParseIntPipe) waterStationId: number,
  ): Promise<ContractTemplateResponse> {
    return this.waterStationsService.getContractTemplate(waterStationId);
  }
}
