import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, STATION_DOCUMENT_LABELS, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import {
  RejectStationDto,
  StationDocumentFileResponse,
  StationDocumentResponse,
  StationReviewQueryDto,
  StationVerificationResponse,
  UpdateBusinessInfoDto,
  UploadStationDocumentDto,
} from './dto/station-verification.dto';
import { StationVerificationsService } from './station-verifications.service';

/** Station owner: business info + KYB documents of their own station. */
@ApiTags('Station Verification (KYB)')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('water-stations/mine/verification')
export class StationVerificationController {
  constructor(private readonly stationVerificationsService: StationVerificationsService) {}

  @Get()
  getVerification(@CurrentUser() user: AuthenticatedUser): Promise<StationVerificationResponse> {
    return this.stationVerificationsService.getVerification(requireWaterStationId(user));
  }

  @Put('business-info')
  @RecordActivity({ type: ActivityType.BusinessInfoUpdated, describe: () => 'Updated the business details' })
  updateBusinessInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() businessInfoDto: UpdateBusinessInfoDto,
  ): Promise<StationVerificationResponse> {
    return this.stationVerificationsService.updateBusinessInfo(requireWaterStationId(user), businessInfoDto);
  }

  @Post('documents')
  @RecordActivity<StationDocumentResponse>({
    type: ActivityType.StationDocumentUploaded,
    describe: ({ result }) => `Uploaded a business document: ${STATION_DOCUMENT_LABELS[result.documentType]}`,
  })
  uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() uploadDto: UploadStationDocumentDto,
  ): Promise<StationDocumentResponse> {
    return this.stationVerificationsService.uploadDocument(requireWaterStationId(user), uploadDto);
  }

  @Get('documents/:stationDocumentId')
  getDocumentFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stationDocumentId', ParseIntPipe) stationDocumentId: number,
  ): Promise<StationDocumentFileResponse> {
    return this.stationVerificationsService.getDocumentFile(requireWaterStationId(user), stationDocumentId);
  }

  @Delete('documents/:stationDocumentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RecordActivity({
    type: ActivityType.StationDocumentDeleted,
    describe: () => 'Removed a business document',
  })
  deleteDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stationDocumentId', ParseIntPipe) stationDocumentId: number,
  ): Promise<void> {
    return this.stationVerificationsService.deleteDocument(requireWaterStationId(user), stationDocumentId);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @RecordActivity({
    type: ActivityType.VerificationSubmitted,
    describe: () => 'Sent the business documents for review',
  })
  submitForReview(@CurrentUser() user: AuthenticatedUser): Promise<StationVerificationResponse> {
    return this.stationVerificationsService.submitForReview(requireWaterStationId(user));
  }
}

/** AquaTap reviewer (SystemAdmin): approves or rejects stations. */
@ApiTags('Station Reviews (SystemAdmin)')
@ApiBearerAuth()
@Roles(UserRole.SystemAdmin)
@Controller('station-reviews')
export class StationReviewsController {
  constructor(private readonly stationVerificationsService: StationVerificationsService) {}

  @Get()
  listStations(@Query() query: StationReviewQueryDto): Promise<StationVerificationResponse[]> {
    return this.stationVerificationsService.listStationsForReview(query.verificationStatus);
  }

  @Get(':waterStationId')
  getStation(
    @Param('waterStationId', ParseIntPipe) waterStationId: number,
  ): Promise<StationVerificationResponse> {
    return this.stationVerificationsService.getVerification(waterStationId);
  }

  @Get(':waterStationId/documents/:stationDocumentId')
  getDocumentFile(
    @Param('waterStationId', ParseIntPipe) waterStationId: number,
    @Param('stationDocumentId', ParseIntPipe) stationDocumentId: number,
  ): Promise<StationDocumentFileResponse> {
    return this.stationVerificationsService.getDocumentFile(waterStationId, stationDocumentId);
  }

  @Post(':waterStationId/approve')
  @HttpCode(HttpStatus.OK)
  @RecordActivity<StationVerificationResponse>({
    type: ActivityType.StationApproved,
    describe: ({ result }) => `Approved the station ${result.stationName}`,
  })
  approveStation(
    @Param('waterStationId', ParseIntPipe) waterStationId: number,
  ): Promise<StationVerificationResponse> {
    return this.stationVerificationsService.approveStation(waterStationId);
  }

  @Post(':waterStationId/reject')
  @HttpCode(HttpStatus.OK)
  @RecordActivity<StationVerificationResponse>({
    type: ActivityType.StationRejected,
    describe: ({ result }) => `Asked the station ${result.stationName} to fix its documents`,
  })
  rejectStation(
    @Param('waterStationId', ParseIntPipe) waterStationId: number,
    @Body() rejectDto: RejectStationDto,
  ): Promise<StationVerificationResponse> {
    return this.stationVerificationsService.rejectStation(waterStationId, rejectDto);
  }
}
