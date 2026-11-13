import { StationVerificationStatus, UserRole } from '../../../common/enums/domain.enums';

export class WaterStationSummaryResponse {
  waterStationId: number;
  stationName: string;
  address: string;
  contactNumber: string;
  pricePerGallon: number;
  latitude: number | null;
  longitude: number | null;
  /** KYB status: only Verified stations are visible to customers. */
  verificationStatus: StationVerificationStatus;
}

export class ProfileResponse {
  userAccountId: number;
  email: string;
  fullName: string | null;
  /** Photo of the Google account. Show `avatarImage` instead when it is set. */
  photoUrl: string | null;
  /** Profile photo uploaded by the user (small JPEG data URI), or null. */
  avatarImage: string | null;
  /** true = the account can also sign in with email + password. */
  hasPassword: boolean;
  /** true = signing in also asks for a code from the authenticator app. */
  isTwoFactorEnabled: boolean;
  /** The device session of this request (matches `userSessionId` in GET /account/sessions). */
  currentSessionId: number | null;
  role: UserRole | null;
  employeeId: number | null;
  customerId: number | null;
  isOwner: boolean;
  /** true while the user still has to choose: customer or station owner. */
  needsOnboarding: boolean;
  waterStation: WaterStationSummaryResponse | null;
}
