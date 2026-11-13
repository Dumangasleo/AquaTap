import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ActivityType, UserRole } from '../../common/enums/domain.enums';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import { RecordActivity } from '../account-activity/record-activity.decorator';
import {
  CreatePaymentChannelDto,
  PaymentChannelResponse,
  UpdatePaymentChannelDto,
} from './dto/payment-channel.dto';
import { PaymentChannelsService } from './payment-channels.service';

@ApiTags('Payment Channels (QR)')
@ApiBearerAuth()
@Controller('payment-channels')
export class PaymentChannelsController {
  constructor(private readonly paymentChannelsService: PaymentChannelsService) {}

  @Get()
  listChannels(@CurrentUser() user: AuthenticatedUser): Promise<PaymentChannelResponse[]> {
    return this.paymentChannelsService.listChannels(user);
  }

  @Roles(UserRole.Admin)
  @Post()
  @RecordActivity<PaymentChannelResponse>({
    type: ActivityType.PaymentChannelAdded,
    describe: ({ result }) => `Added the payment account ${result.channelName}`,
  })
  createChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreatePaymentChannelDto,
  ): Promise<PaymentChannelResponse> {
    return this.paymentChannelsService.createChannel(requireWaterStationId(user), createDto);
  }

  @Roles(UserRole.Admin)
  @Patch(':paymentChannelId')
  @RecordActivity<PaymentChannelResponse>({
    type: ActivityType.PaymentChannelUpdated,
    describe: ({ result }) => `Updated the payment account ${result.channelName}`,
  })
  updateChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentChannelId', ParseIntPipe) paymentChannelId: number,
    @Body() updateDto: UpdatePaymentChannelDto,
  ): Promise<PaymentChannelResponse> {
    return this.paymentChannelsService.updateChannel(
      requireWaterStationId(user),
      paymentChannelId,
      updateDto,
    );
  }
}
