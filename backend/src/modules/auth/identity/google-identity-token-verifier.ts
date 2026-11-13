import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AppConfig } from '../../../config/app-config';
import { VerifiedIdentity } from '../../user-accounts/user-accounts.service';
import { IdentityTokenVerifier } from './identity-token-verifier';

/** Verifies the Google ID token sent by the mobile app (signature, expiry and audience). */
@Injectable()
export class GoogleIdentityTokenVerifier extends IdentityTokenVerifier {
  private readonly logger = new Logger(GoogleIdentityTokenVerifier.name);
  private readonly oauthClient = new OAuth2Client();
  private readonly allowedClientIds: string[];

  constructor(configService: ConfigService<AppConfig, true>) {
    super();
    this.allowedClientIds = configService.get('auth.googleClientIds', { infer: true });
  }

  async verify(idToken: string): Promise<VerifiedIdentity> {
    if (this.allowedClientIds.length === 0) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured yet. Set GOOGLE_WEB_CLIENT_ID in backend/.env.',
      );
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({ idToken, audience: this.allowedClientIds });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.email_verified) {
        throw new UnauthorizedException('Your Google account email is not verified.');
      }
      return {
        email: payload.email,
        googleSubject: payload.sub,
        fullName: payload.name ?? null,
        photoUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Google token rejected: ${(error as Error).message}`);
      throw new UnauthorizedException('Google sign-in failed. Please try again.');
    }
  }
}
