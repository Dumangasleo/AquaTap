import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, STAFF_ROLES } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { formatPeso, pluralize } from '../../common/utils/text.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import { CreditsService } from './credits.service';
import {
  CreditListResponse,
  CreditQueryDto,
  SettleCreditsDto,
  SettleCreditsResponse,
} from './dto/credit.dto';

@ApiTags('Credits (Utang)')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  listCredits(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CreditQueryDto,
  ): Promise<CreditListResponse> {
    return this.creditsService.listCredits(user, query);
  }

  @Post('settle')
  @HttpCode(HttpStatus.OK)
  @RecordActivity<SettleCreditsResponse>({
    type: ActivityType.CreditsSettled,
    describe: ({ result }) =>
      `Marked ${pluralize(result.settledCount, 'order')} as paid (${formatPeso(result.totalAmountPaid)})`,
  })
  settleCredits(
    @CurrentUser() user: AuthenticatedUser,
    @Body() settleDto: SettleCreditsDto,
  ): Promise<SettleCreditsResponse> {
    return this.creditsService.settleCredits(user, settleDto);
  }
}
