import '../global.css';

import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { VarelaRound_400Regular } from '@expo-google-fonts/varela-round';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Uniwind } from 'uniwind';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { LoadingView } from '../components/ui/StateViews';
import { ToastProvider } from '../components/ui/Toast';
import { useAuthStore } from '../store/auth-store';
import { colors } from '../theme/tokens';

// AquaTap has one (light) look, so the phone's dark mode does not change the colors.
Uniwind.setTheme('light');

export default function RootLayout() {
  const restoreSession = useAuthStore((state) => state.restoreSession);
  // "Soft Aqua" fonts: Nunito Sans (text, labels) + Varela Round (titles, big numbers).
  const [areFontsLoaded, fontError] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    VarelaRound_400Regular,
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true },
          mutations: { retry: 0 },
        },
      }),
  );

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // If the font cannot load, the app still opens with the phone's default font.
  const isReady = areFontsLoaded || fontError !== null;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <StatusBar style="dark" />
          {isReady ? (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            />
          ) : (
            <LoadingView message="Opening AquaTap..." />
          )}
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
