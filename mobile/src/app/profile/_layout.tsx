import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';

/** "My profile" screens (photo, password, two-step sign-in, devices, history) for every signed-in user. */
export default function ProfileLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
