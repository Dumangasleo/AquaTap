import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/auth-store';
import type { UserRole } from '../types/api.types';

/** Protects a section of the app: users without one of the roles are sent back to the start. */
export function RoleGate({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const profile = useAuthStore((state) => state.profile);

  if (status === 'loading') return null;
  if (!profile?.role || !allowedRoles.includes(profile.role)) return <Redirect href="/" />;
  return <>{children}</>;
}
