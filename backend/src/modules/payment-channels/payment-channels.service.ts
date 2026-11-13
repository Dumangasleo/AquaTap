import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { requireWaterStationId } from '../../common/utils/user-scope.util';
import {
  CreatePaymentChannelDto,
  PaymentChannelResponse,
  UpdatePaymentChannelDto,
} from './dto/payment-channel.dto';
import { PaymentChannel } from './payment-channel.entity';

const QR_IMAGE_PATTERN = /^data:image\/(png|jpe?g|webp);base64,/;

/** GCash / bank accounts (with QR codes) where customers can send payments. */
@Injectable()
export class PaymentChannelsService {
  constructor(
    @InjectRepository(PaymentChannel) private readonly paymentChannelRepository: Repository<PaymentChannel>,
  ) {}

  /** Customers see active channels only; the admin sees all of them. */
  async listChannels(user: AuthenticatedUser): Promise<PaymentChannelResponse[]> {
    const waterStationId = requireWaterStationId(user);
    const channels = await this.paymentChannelRepository.find({
      where: user.role === UserRole.Admin ? { waterStationId } : { waterStationId, isActive: true },
      order: { channelType: 'ASC', channelName: 'ASC' },
    });
    return channels.map((channel) => this.toResponse(channel));
  }

  async createChannel(
    waterStationId: number,
    createDto: CreatePaymentChannelDto,
  ): Promise<PaymentChannelResponse> {
    const channel = await this.paymentChannelRepository.save(
      this.paymentChannelRepository.create({
        waterStationId,
        channelType: createDto.channelType,
        channelName: createDto.channelName.trim(),
        accountName: createDto.accountName.trim(),
        accountNumber: createDto.accountNumber.trim(),
        qrImage: createDto.qrImage ?? null,
        isActive: true,
      }),
    );
    return this.toResponse(channel);
  }

  async updateChannel(
    waterStationId: number,
    paymentChannelId: number,
    updateDto: UpdatePaymentChannelDto,
  ): Promise<PaymentChannelResponse> {
    const channel = await this.paymentChannelRepository.findOne({
      where: { paymentChannelId, waterStationId },
    });
    if (!channel) throw new NotFoundException('Payment channel not found.');

    if (updateDto.channelName !== undefined) channel.channelName = updateDto.channelName.trim();
    if (updateDto.accountName !== undefined) channel.accountName = updateDto.accountName.trim();
    if (updateDto.accountNumber !== undefined) channel.accountNumber = updateDto.accountNumber.trim();
    if (updateDto.isActive !== undefined) channel.isActive = updateDto.isActive;
    if (updateDto.qrImage !== undefined) {
      if (updateDto.qrImage && !QR_IMAGE_PATTERN.test(updateDto.qrImage)) {
        throw new BadRequestException('The QR code must be a PNG or JPEG image.');
      }
      channel.qrImage = updateDto.qrImage || null;
    }

    return this.toResponse(await this.paymentChannelRepository.save(channel));
  }

  private toResponse(channel: PaymentChannel): PaymentChannelResponse {
    return {
      paymentChannelId: channel.paymentChannelId,
      channelType: channel.channelType,
      channelName: channel.channelName,
      accountName: channel.accountName,
      accountNumber: channel.accountNumber,
      qrImage: channel.qrImage,
      isActive: channel.isActive,
    };
  }
}
