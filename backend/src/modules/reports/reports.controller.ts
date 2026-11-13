import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { STAFF_ROLES, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import { BusinessSummaryService } from './business-summary.service';
import { DailyReportService } from './daily-report.service';
import {
  BusinessSummaryQueryDto,
  BusinessSummaryResponse,
  DailyReportQueryDto,
  DailyReportResponse,
} from './dto/report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly businessSummaryService: BusinessSummaryService,
  ) {}

  @Roles(...STAFF_ROLES)
  @Get('daily')
  getDailyReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DailyReportQueryDto,
  ): Promise<DailyReportResponse> {
    return this.dailyReportService.getDailyReport(user, query);
  }

  @Roles(UserRole.Admin)
  @Get('business-summary')
  getBusinessSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BusinessSummaryQueryDto,
  ): Promise<BusinessSummaryResponse> {
    return this.businessSummaryService.getYearSummary(
      requireWaterStationId(user),
      query.year ?? new Date().getFullYear(),
    );
  }
}
