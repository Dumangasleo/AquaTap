import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { authApi } from '../api/aquatap-api';
import { getErrorMessage } from '../api/http-client';
import {
  AppText,
  Badge,
  Banner,
  Button,
  Card,
  HeroHeader,
  Icon,
  PasswordField,
  Screen,
  TextField,
  useToast,
} from '../components/ui';
import { appConfig } from '../config/app-config';
import { getGoogleSignInAvailability, signInWithGoogle } from '../features/auth/google-sign-in';
import { ServerAddressSheet } from '../features/auth/ServerAddressSheet';
import { TwoFactorStep } from '../features/auth/TwoFactorStep';
import { queryKeys } from '../hooks/query-keys';
import { useAuthStore } from '../store/auth-store';
import { useServerAddressStore } from '../store/server-address-store';
import { colors } from '../theme/tokens';
import { cn } from '../utils/cn';
import type { SignInResult } from '../types/api.types';

/** Demo accounts created by database/aquatap_seed.sql (test sign-in only). */
const DEMO_ACCOUNTS = [
  { email: 'owner@aquatap.test', label: 'Owner' },
  { email: 'rider@aquatap.test', label: 'Rider' },
  { email: 'juan@aquatap.test', label: 'Customer' },
];

export default function SignInScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const startSession = useAuthStore((state) => state.startSession);
  const apiBaseUrl = useServerAddressStore((state) => state.apiBaseUrl);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [isServerSheetVisible, setIsServerSheetVisible] = useState(false);

  const authConfigQuery = useQuery({ queryKey: queryKeys.authConfig, queryFn: authApi.getConfig, retry: 2 });
  const googleWebClientId = authConfigQuery.data?.googleWebClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? null;
  const googleAvailability = getGoogleSignInAvailability(googleWebClientId);
  const isServerReachable = authConfigQuery.isSuccess;

  /** Opens the app, or asks for the 6-digit code when the account has two-step sign-in. */
  const finishSignIn = async (result: SignInResult | null) => {
    if (!result) return;
    if (result.requiresTwoFactor && result.twoFactorToken) {
      setTwoFactorToken(result.twoFactorToken);
      return;
    }
    if (result.accessToken && result.profile) {
      await startSession({ accessToken: result.accessToken, profile: result.profile });
      router.replace('/');
    }
  };
  const showError = (error: unknown) => showToast(getErrorMessage(error), 'error');

  const googleSignIn = useMutation({
    mutationFn: async () => {
      const result = await signInWithGoogle(googleWebClientId ?? '');
      if (result.status === 'cancelled') return null;
      if (result.status === 'unavailable') throw new Error(result.reason);
      return authApi.signInWithGoogle(result.idToken);
    },
    onSuccess: finishSignIn,
    onError: showError,
  });

  const passwordSignIn = useMutation({
    mutationFn: () => authApi.signInWithPassword(email.trim(), password),
    onSuccess: finishSignIn,
    onError: showError,
  });

  const testSignIn = useMutation({
    mutationFn: (emailAddress: string) => authApi.signInAsDeveloper(emailAddress.trim()),
    onSuccess: finishSignIn,
    onError: showError,
  });

  return (
    <Screen edges={['bottom']} contentClassName="gap-0 p-0 pb-8">
      <HeroHeader className="items-center gap-2 pb-14">
        <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-surface/20">
          <Icon name="water" size={44} color={colors.textOnPrimary} />
        </View>
        <AppText variant="display" className="text-center text-[32px] leading-[38px] text-on-brand">
          AquaTap
        </AppText>
        <AppText className="max-w-[320px] text-center text-on-brand/90">
          Order water, see your gallons and your utang. No more paper records.
        </AppText>
      </HeroHeader>

      <View className="-mt-8 w-full max-w-[520px] gap-4 self-center px-4">
        {twoFactorToken ? (
          <TwoFactorStep
            twoFactorToken={twoFactorToken}
            onSignedIn={finishSignIn}
            onCancel={() => setTwoFactorToken(null)}
          />
        ) : (
          <Card className="gap-4 p-5">
            <View className="gap-1">
              <AppText variant="title">Welcome</AppText>
              <AppText variant="caption" className="text-ink-muted">
                Sign in with your Google account. New here? Signing in creates your account.
              </AppText>
            </View>

            <Button
              label="Continue with Google"
              icon="logo-google"
              size="lg"
              fullWidth
              isLoading={googleSignIn.isPending}
              isDisabled={!googleAvailability.isAvailable || !isServerReachable}
              onPress={() => googleSignIn.mutate()}
            />
            {!googleAvailability.isAvailable && isServerReachable ? (
              <AppText variant="caption" className="text-center text-ink-subtle">
                {googleAvailability.reason}
              </AppText>
            ) : null}

            <View className="flex-row items-center gap-3">
              <View className="h-px flex-1 bg-line" />
              <AppText variant="overline">Or use your password</AppText>
              <View className="h-px flex-1 bg-line" />
            </View>

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              leftIcon="mail-outline"
            />
            <PasswordField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              autoComplete="current-password"
              helperText="No password yet? Sign in with Google, then add one in your profile."
            />
            <Button
              label="Sign in"
              icon="log-in-outline"
              variant="secondary"
              size="lg"
              fullWidth
              isLoading={passwordSignIn.isPending}
              isDisabled={!email.includes('@') || password.length === 0 || !isServerReachable}
              onPress={() => passwordSignIn.mutate()}
            />
          </Card>
        )}

        {authConfigQuery.isError ? (
          <Banner
            tone="danger"
            icon="cloud-offline-outline"
            title="Cannot connect"
            message={getErrorMessage(authConfigQuery.error)}
            action={
              <View className="flex-row flex-wrap gap-1">
                <Button label="Try again" variant="ghost" size="sm" icon="refresh" onPress={() => void authConfigQuery.refetch()} />
                {appConfig.canChangeServerAddress ? (
                  <Button
                    label="Change server"
                    variant="ghost"
                    size="sm"
                    icon="link-outline"
                    onPress={() => setIsServerSheetVisible(true)}
                  />
                ) : null}
              </View>
            }
          />
        ) : null}

        {authConfigQuery.data?.isDevSignInEnabled && !twoFactorToken ? (
          <Card className="gap-3 p-5">
            <View className="flex-row items-center justify-between gap-2">
              <AppText variant="heading">Test sign-in</AppText>
              <Badge label="For testing" tone="warning" />
            </View>
            <AppText variant="caption" className="text-ink-muted">
              Sign in with an email only. This is turned off when the app goes live.
            </AppText>
            <View className="flex-row gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  label={account.label}
                  variant={testEmail === account.email ? 'secondary' : 'outline'}
                  onPress={() => setTestEmail(account.email)}
                  className="flex-1 px-2"
                />
              ))}
            </View>
            <TextField
              label="Email"
              value={testEmail}
              onChangeText={setTestEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
            />
            <Button
              label="Test sign in"
              icon="flask-outline"
              variant="outline"
              fullWidth
              isLoading={testSignIn.isPending}
              isDisabled={!testEmail.includes('@')}
              onPress={() => testSignIn.mutate(testEmail)}
            />
          </Card>
        ) : null}

        <Pressable
          className="min-h-[48px] flex-row items-center gap-2 px-1"
          disabled={!appConfig.canChangeServerAddress}
          onPress={() => setIsServerSheetVisible(true)}
          accessibilityRole={appConfig.canChangeServerAddress ? 'button' : 'text'}
          accessibilityLabel={`Server ${isServerReachable ? 'connected' : 'not reachable'}: ${apiBaseUrl}`}
          accessibilityHint={appConfig.canChangeServerAddress ? 'Opens the server address settings' : undefined}
        >
          <View className={cn('h-2 w-2 rounded-full', isServerReachable ? 'bg-success' : 'bg-danger')} />
          <AppText variant="tiny" className="flex-1 text-ink-subtle" numberOfLines={1}>
            Server: {apiBaseUrl}
          </AppText>
          {appConfig.canChangeServerAddress ? (
            <AppText variant="tiny" className="text-brand">
              Change
            </AppText>
          ) : null}
        </Pressable>
      </View>

      {appConfig.canChangeServerAddress && isServerSheetVisible ? (
        <ServerAddressSheet onClose={() => setIsServerSheetVisible(false)} />
      ) : null}
    </Screen>
  );
}
