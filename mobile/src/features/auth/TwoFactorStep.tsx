import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { authApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import { AppText, Button, Card, CodeField, Icon, TextField } from '../../components/ui';
import { colors } from '../../theme/tokens';
import type { SignInResult } from '../../types/api.types';

interface TwoFactorStepProps {
  /** Short-lived token returned by the first sign-in step. */
  twoFactorToken: string;
  onSignedIn: (result: SignInResult) => void | Promise<void>;
  onCancel: () => void;
}

/** Second sign-in step: the 6-digit code from the authenticator app, or one of the backup codes. */
export function TwoFactorStep({ twoFactorToken, onSignedIn, onCancel }: TwoFactorStepProps) {
  const [code, setCode] = useState('');
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const verification = useMutation({
    mutationFn: (enteredCode: string) => authApi.verifyTwoFactor(twoFactorToken, enteredCode.trim()),
    onSuccess: onSignedIn,
    onError: (error) => setErrorText(getErrorMessage(error)),
  });

  const changeCode = (nextCode: string) => {
    setCode(nextCode);
    setErrorText(null);
  };

  const switchMode = () => {
    setIsUsingBackupCode((wasUsingBackupCode) => !wasUsingBackupCode);
    changeCode('');
  };

  const isCodeComplete = isUsingBackupCode ? code.trim().length >= 8 : code.length === 6;

  return (
    <Card className="gap-4 p-5">
      <View className="h-14 w-14 items-center justify-center self-center rounded-full bg-brand-soft">
        <Icon name="shield-checkmark" size={30} color={colors.primary} />
      </View>
      <View className="gap-1">
        <AppText variant="title" className="text-center">
          Enter your code
        </AppText>
        <AppText variant="caption" className="text-center text-ink-muted">
          {isUsingBackupCode
            ? 'Type one of the backup codes you saved when you turned on two-step sign-in. Each code works once.'
            : 'Open your authenticator app and type the 6 numbers shown for AquaTap.'}
        </AppText>
      </View>

      {isUsingBackupCode ? (
        <TextField
          label="Backup code"
          value={code}
          onChangeText={changeCode}
          placeholder="XXXX-XXXX"
          autoCapitalize="characters"
          autoCorrect={false}
          leftIcon="key-outline"
          errorText={errorText}
        />
      ) : (
        <CodeField
          label="6-digit code"
          value={code}
          onChangeText={changeCode}
          errorText={errorText}
          autoFocus
          onComplete={(completeCode) => verification.mutate(completeCode)}
        />
      )}

      <Button
        label="Continue"
        size="lg"
        fullWidth
        isLoading={verification.isPending}
        isDisabled={!isCodeComplete}
        onPress={() => verification.mutate(code)}
      />
      <Button
        label={isUsingBackupCode ? 'Use the 6-digit code' : 'Use a backup code'}
        variant="ghost"
        fullWidth
        onPress={switchMode}
      />
      <Button label="Back to sign in" variant="ghost" icon="arrow-back" fullWidth onPress={onCancel} />
    </Card>
  );
}
