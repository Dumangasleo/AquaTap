import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { signOutFromGoogle } from '../features/auth/google-sign-in';
import { useAuthStore } from '../store/auth-store';
import { confirmAction } from '../utils/confirm';

/** Asks first, then signs out on this device and returns to the sign-in screen. */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOut = useAuthStore((state) => state.signOut);

  return async () => {
    const isConfirmed = await confirmAction({
      title: 'Sign out?',
      message: 'You will need to sign in again to use AquaTap on this phone.',
      confirmLabel: 'Yes, sign out',
      cancelLabel: 'No, stay signed in',
      tone: 'danger',
      icon: 'log-out-outline',
    });
    if (!isConfirmed) return;
    await signOutFromGoogle();
    await signOut();
    queryClient.clear();
    router.replace('/sign-in');
  };
}
