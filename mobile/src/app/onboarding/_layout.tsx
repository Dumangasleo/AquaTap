import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';

/** Onboarding is only for signed-in users who have not chosen customer / station owner yet. */
export default function OnboardingLayout() {
  const status = useAuthStore((state) => state.status);
  const profile = useAuthStore((state) => state.profile);

  if (status === 'loading') return null;
  if (status === 'signedOut' || !profile) return <Redirect href="/sign-in" />;
  if (!profile.needsOnboarding) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
