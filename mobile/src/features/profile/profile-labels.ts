import type { IconName } from '../../components/ui';
import type { Tone } from '../../theme/tokens';
import type { ActivityCategory, DevicePlatform, Profile, SignInMethod } from '../../types/api.types';

/** "Owner", "Employee", "Customer"... in plain words. */
export function getRoleLabel(profile: Profile): string {
  switch (profile.role) {
    case 'Admin':
      return profile.isOwner ? 'Owner' : 'Admin';
    case 'Employee':
      return 'Employee';
    case 'Customer':
      return 'Customer';
    case 'SystemAdmin':
      return 'AquaTap staff';
    default:
      return 'New account';
  }
}

export const devicePlatformIcons: Record<DevicePlatform, IconName> = {
  Android: 'phone-portrait-outline',
  iOS: 'phone-portrait-outline',
  Web: 'laptop-outline',
  Unknown: 'hardware-chip-outline',
};

export const signInMethodLabels: Record<SignInMethod, string> = {
  Google: 'Signed in with Google',
  Password: 'Signed in with password',
  Developer: 'Test sign-in',
};

export const activityCategoryDetails: Record<ActivityCategory, { label: string; icon: IconName; tone: Tone }> = {
  Security: { label: 'Security', icon: 'shield-checkmark-outline', tone: 'primary' },
  Profile: { label: 'Profile', icon: 'person-outline', tone: 'accent' },
  Orders: { label: 'Orders', icon: 'water-outline', tone: 'info' },
  Payments: { label: 'Payments', icon: 'cash-outline', tone: 'success' },
  Shift: { label: 'Time in / out', icon: 'time-outline', tone: 'warning' },
  Station: { label: 'Station', icon: 'storefront-outline', tone: 'neutral' },
};

export interface ActivityFilterOption {
  value: ActivityCategory | 'All';
  label: string;
}

export const activityFilterOptions: ActivityFilterOption[] = [
  { value: 'All', label: 'All' },
  { value: 'Orders', label: 'Orders' },
  { value: 'Payments', label: 'Payments' },
  { value: 'Security', label: 'Security' },
  { value: 'Shift', label: 'Time in / out' },
  { value: 'Profile', label: 'Profile' },
  { value: 'Station', label: 'Station' },
];

/** The new password must be 8 to 72 characters with at least one letter and one number (same rule as the API). */
export function getPasswordProblem(password: string): string | null {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 72) return 'Use 72 characters or fewer.';
  if (!/[A-Za-z]/.test(password)) return 'Add at least one letter.';
  if (!/\d/.test(password)) return 'Add at least one number.';
  return null;
}
