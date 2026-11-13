import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { LoadingView } from '../components/ui/StateViews';
import { isStaffRole, useAuthStore } from '../store/auth-store';

/** Entry point: sends the user to the right part of the app based on their session and role. */
export default function IndexRoute() {
  const status = useAuthStore((state) => state.status);
  const profile = useAuthStore((state) => state.profile);

  if (status === 'loading') {
    return (
      <View className="flex-1 justify-center bg-canvas">
        <LoadingView message="Opening AquaTap…" />
      </View>
    );
  }
  if (status === 'signedOut' || !profile) return <Redirect href="/sign-in" />;
  if (profile.role === 'SystemAdmin') return <Redirect href="/system" />;
  if (profile.needsOnboarding) return <Redirect href="/onboarding" />;
  if (isStaffRole(profile)) return <Redirect href="/staff" />;
  return <Redirect href="/customer" />;
}
