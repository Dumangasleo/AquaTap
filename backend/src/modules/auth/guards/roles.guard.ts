import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_ROLES_KEY, AuthenticatedRequest } from '../../../common/decorators/auth.decorators';
import { UserRole } from '../../../common/enums/domain.enums';

/** Global guard: enforces @Roles(...) on controllers / routes. Runs after JwtAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ALLOWED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user?.role && allowedRoles.includes(user.role)) return true;

    throw new ForbiddenException('You do not have access to this feature.');
  }
}
