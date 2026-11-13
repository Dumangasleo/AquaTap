import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../enums/domain.enums';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export const IS_PUBLIC_ROUTE_KEY = 'isPublicRoute';
export const ALLOWED_ROLES_KEY = 'allowedRoles';

/** Skips JWT authentication for the decorated route. */
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE_KEY, true);

/** Restricts the decorated route (or controller) to the given roles. */
export const Roles = (...allowedRoles: UserRole[]) => SetMetadata(ALLOWED_ROLES_KEY, allowedRoles);

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

/** Injects the signed-in user resolved by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
