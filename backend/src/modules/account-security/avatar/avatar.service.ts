import { BadRequestException, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { UserAccountsService } from '../../user-accounts/user-accounts.service';

const AVATAR_SIZE_PIXELS = 256;
const AVATAR_JPEG_QUALITY = 82;

/** Profile photo: any phone photo becomes a small square JPEG, so it loads fast everywhere. */
@Injectable()
export class AvatarService {
  constructor(private readonly userAccountsService: UserAccountsService) {}

  /** Crops the photo to a centered square, shrinks it to 256 x 256 and saves it as a data URI. */
  async changeAvatar(userAccountId: number, imageDataUri: string): Promise<void> {
    const base64Image = imageDataUri.slice(imageDataUri.indexOf(',') + 1);
    const avatarImage = await this.createAvatarImage(Buffer.from(base64Image, 'base64'));
    await this.userAccountsService.updateAvatarImage(userAccountId, avatarImage);
  }

  async removeAvatar(userAccountId: number): Promise<void> {
    await this.userAccountsService.updateAvatarImage(userAccountId, null);
  }

  private async createAvatarImage(originalImage: Buffer): Promise<string> {
    try {
      const avatarJpeg = await sharp(originalImage)
        .rotate() // turn the photo upright using the camera's orientation tag
        .resize(AVATAR_SIZE_PIXELS, AVATAR_SIZE_PIXELS, { fit: 'cover', position: 'centre' })
        .flatten({ background: '#FFFFFF' }) // transparent PNG / WEBP areas become white
        .jpeg({ quality: AVATAR_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      return `data:image/jpeg;base64,${avatarJpeg.toString('base64')}`;
    } catch {
      throw new BadRequestException('We could not read that photo. Please choose another one.');
    }
  }
}
