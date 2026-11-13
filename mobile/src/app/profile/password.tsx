import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { accountApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  Banner,
  Button,
  Card,
  Icon,
  PasswordField,
  Screen,
  ScreenHeader,
  useConfirm,
  useToast,
} from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';

/** One line of the password checklist: green check when the rule is met. */
function PasswordRule({ isMet, label }: { isMet: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name={isMet ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={isMet ? colors.success : colors.textSubtle} />
      <AppText variant="caption" className={cn(isMet ? 'text-success' : 'text-ink-muted')}>
        {label}
      </AppText>
    </View>
  );
}

export default function PasswordScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatedPassword, setRepeatedPassword] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  // A device that signed in with Google may set a new password without the old one (forgot password).
  const sessionsQuery = useQuery({ queryKey: queryKeys.accountSessions, queryFn: accountApi.listSessions });
  const isGoogleSession = sessionsQuery.data?.find((session) => session.isCurrent)?.signInMethod === 'Google';
  const hasPassword = profile?.hasPassword ?? false;
  const needsCurrentPassword = hasPassword && !isGoogleSession;

  const rules = {
    length: newPassword.length >= 8 && newPassword.length <= 72,
    letter: /[A-Za-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    match: newPassword.length > 0 && newPassword === repeatedPassword,
  };
  const canSave =
    rules.length && rules.letter && rules.number && rules.match && (!needsCurrentPassword || currentPassword.length > 0);

  const changePassword = useMutation({
    mutationFn: () =>
      accountApi.changePassword({
        currentPassword: needsCurrentPassword ? currentPassword : undefined,
        newPassword,
      }),
    onSuccess: async () => {
      await refreshProfile();
      showToast(hasPassword ? 'Your password was changed' : 'Your password was saved');
      router.back();
    },
    onError: (error) => setErrorText(getErrorMessage(error)),
  });

  const savePassword = async () => {
    const isConfirmed = await confirm({
      title: hasPassword ? 'Change your password?' : 'Save this password?',
      message: 'Your other phones and computers will be signed out. This phone stays signed in.',
      confirmLabel: hasPassword ? 'Yes, change password' : 'Yes, save password',
      icon: 'lock-closed',
    });
    if (isConfirmed) {
      setErrorText(null);
      changePassword.mutate();
    }
  };

  return (
    <Screen
      header={<ScreenHeader title={hasPassword ? 'Change password' : 'Add a password'} showBackButton />}
      footer={
        <Button
          label={hasPassword ? 'Change password' : 'Save password'}
          icon="lock-closed-outline"
          size="lg"
          fullWidth
          isLoading={changePassword.isPending}
          isDisabled={!canSave}
          onPress={() => void savePassword()}
        />
      }
    >
      {!hasPassword ? (
        <Banner
          tone="info"
          title="Sign in without Google"
          message={`With a password you can also sign in using your email (${profile?.email ?? ''}) and this password.`}
        />
      ) : null}
      {hasPassword && isGoogleSession ? (
        <Banner
          tone="info"
          title="Forgot your password?"
          message="You signed in with Google on this phone, so you can set a new password without typing the old one."
        />
      ) : null}

      <Card className="gap-4">
        {needsCurrentPassword ? (
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              setErrorText(null);
            }}
            placeholder="Your password now"
            autoComplete="current-password"
            errorText={errorText}
          />
        ) : null}
        <PasswordField
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          errorText={needsCurrentPassword ? null : errorText}
        />
        <PasswordField
          label="Type the new password again"
          value={repeatedPassword}
          onChangeText={setRepeatedPassword}
          placeholder="Same as above"
          autoComplete="new-password"
        />

        <View className="gap-1.5 rounded-field bg-canvas p-3.5">
          <AppText variant="overline">Your new password needs</AppText>
          <PasswordRule isMet={rules.length} label="8 characters or more" />
          <PasswordRule isMet={rules.letter} label="At least one letter" />
          <PasswordRule isMet={rules.number} label="At least one number" />
          <PasswordRule isMet={rules.match} label="Both boxes are the same" />
        </View>
      </Card>
    </Screen>
  );
}
