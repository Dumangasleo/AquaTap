import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest, IS_PUBLIC_ROUTE_KEY } from '../../../common/decorators/auth.decorators';
import { JwtPayload } from '../../../common/interfaces/authenticated-user.interface';
import { normalizeIpAddress } from '../../../common/utils/request.util';
import { UserSessionsService } from '../../account-security/sessions/user-sessions.service';
import { UserAccountsService } from '../../user-accounts/user-accounts.service';

const SIGNED_OUT_MESSAGE = 'You were signed out on this device. Please sign in again.';

/**
 * Global guard: every route needs a valid Bearer token unless it is marked with @Public().
 * The token must also belong to a device session that is still signed in, so
 * "sign out this device" (Profile > Devices) takes effect immediately.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userAccountsService: UserAccountsService,
    private readonly userSessionsService: UserSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublicRoute) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractBearerToken(request.headers.authorization);
    if (!accessToken) throw new UnauthorizedException('Please sign in to continue.');

    const payload = await this.verifyAccessToken(accessToken);
    const identity = await this.userAccountsService.resolveAuthenticatedUser(payload.sub, payload.sid);
    if (identity.status === 'AccountUnavailable') {
      throw new UnauthorizedException('Your account is disabled or no longer exists.');
    }
    if (identity.status === 'SessionEnded') {
      throw new UnauthorizedException(SIGNED_OUT_MESSAGE);
    }

    request.user = identity.user;
    await this.userSessionsService.refreshLastActive(
      identity.user.userSessionId,
      identity.sessionLastActiveAt,
      normalizeIpAddress(request.ip),
    );
    return true;
  }

  private async verifyAccessToken(accessToken: string): Promise<JwtPayload> {
    let payload: Partial<JwtPayload> & { purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync<Partial<JwtPayload> & { purpose?: string }>(accessToken);
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    // Only access tokens are accepted here: they name a device session and have no special purpose
    // (the short-lived two-factor token has a purpose and no session).
    if (
      payload.purpose !== undefined ||
      typeof payload.sub !== 'number' ||
      typeof payload.sid !== 'number' ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException(SIGNED_OUT_MESSAGE);
    }
    return { sub: payload.sub, email: payload.email, sid: payload.sid };
  }

  private extractBearerToken(authorizationHeader: string | undefined): string | null {
    if (!authorizationHeader) return null;
    const [scheme, token] = authorizationHeader.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : null;
  }
}
