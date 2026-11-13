import { SignInMethod, UserRole } from '../enums/domain.enums';

/** What an account is allowed to see and do: its role and where it belongs. */
export interface AccountAccess {
  userAccountId: number;
  email: string;
  fullName: string | null;
  role: UserRole | null;
  waterStationId: number | null;
  employeeId: number | null;
  customerId: number | null;
  isOwner: boolean;
}

/** Request-scoped identity, resolved by JwtAuthGuard on every authenticated request. */
export interface AuthenticatedUser extends AccountAccess {
  /** The device session (UserSession) this request belongs to. */
  userSessionId: number;
  /** Name of the signed-in device, e.g. "Samsung SM-A546E" (used by the activity log). */
  deviceName: string;
}

/** Access token: proves who the user is and which device session the token belongs to. */
export interface JwtPayload {
  sub: number;
  email: string;
  /** UserSessionID. Signing out the device ends the session, so the token stops working. */
  sid: number;
}

export const TWO_FACTOR_TOKEN_PURPOSE = 'two-factor';

/**
 * Short-lived token given after the first sign-in step when two-step verification is on.
 * It only allows finishing the sign-in with a code; it is never accepted as an access token.
 */
export interface TwoFactorTokenPayload {
  sub: number;
  purpose: typeof TWO_FACTOR_TOKEN_PURPOSE;
  /** How the first step was done, saved on the device session once the code is confirmed. */
  method: SignInMethod;
}
