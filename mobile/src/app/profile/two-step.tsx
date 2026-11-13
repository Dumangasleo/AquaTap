import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode } from 'react';
import { Image, Linking, View } from 'react-native';
import { accountApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  Badge,
  Banner,
  BottomSheet,
  Button,
  Card,
  CodeField,
  Icon,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import type { TwoFactorSetup } from '../../types/api.types';
import { cn } from '../../utils/cn';

type CodeAction = 'turnOff' | 'newBackupCodes';

/** Numbered step of the setup guide. */
function SetupStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
          <AppText variant="label" className="font-heading text-on-brand">
            {number}
          </AppText>
        </View>
        <AppText variant="heading" className="flex-1">
          {title}
        </AppText>
      </View>
      {children}
    </Card>
  );
}

/** Backup codes shown once: the user must save them. */
function BackupCodesCard({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { showToast } = useToast();

  const copyCodes = async () => {
    await Clipboard.setStringAsync(codes.join('\n'));
    showToast('Backup codes copied');
  };

  return (
    <Card className="gap-4">
      <View className="h-14 w-14 items-center justify-center self-center rounded-full bg-success-soft">
        <Icon name="key" size={28} color={colors.success} />
      </View>
      <View className="gap-1">
        <AppText variant="title" className="text-center">
          Save your backup codes
        </AppText>
        <AppText variant="caption" className="text-center text-ink-muted">
          If you lose your phone, use one of these codes to sign in. Each code works one time. They are shown only now.
        </AppText>
      </View>
      <View className="flex-row flex-wrap justify-between gap-y-2 rounded-field bg-canvas p-4">
        {codes.map((code) => (
          <AppText key={code} variant="bodyStrong" className="w-[48%] text-center font-heading tracking-[1px]" selectable>
            {code}
          </AppText>
        ))}
      </View>
      <Button label="Copy the codes" icon="copy-outline" variant="secondary" fullWidth onPress={() => void copyCodes()} />
      <Button label="I saved my codes" icon="checkmark" size="lg" fullWidth onPress={onDone} />
    </Card>
  );
}

export default function TwoStepSignInScreen() {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [codeAction, setCodeAction] = useState<CodeAction | null>(null);
  const [actionCode, setActionCode] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const isEnabled = profile?.isTwoFactorEnabled ?? false;
  const showError = (error: unknown) => showToast(getErrorMessage(error), 'error');

  const startSetup = useMutation({ mutationFn: accountApi.setupTwoFactor, onSuccess: setSetup, onError: showError });

  const turnOn = useMutation({
    mutationFn: (code: string) => accountApi.enableTwoFactor(code),
    onSuccess: async ({ recoveryCodes }) => {
      await refreshProfile();
      setSetup(null);
      setSetupCode('');
      setBackupCodes(recoveryCodes);
      showToast('Two-step sign-in is on');
    },
    onError: (error) => setSetupError(getErrorMessage(error)),
  });

  const closeCodeSheet = () => {
    setCodeAction(null);
    setActionCode('');
    setActionError(null);
  };

  const turnOff = useMutation({
    mutationFn: (code: string) => accountApi.disableTwoFactor(code),
    onSuccess: async () => {
      await refreshProfile();
      closeCodeSheet();
      showToast('Two-step sign-in is off');
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const createBackupCodes = useMutation({
    mutationFn: (code: string) => accountApi.regenerateRecoveryCodes(code),
    onSuccess: ({ recoveryCodes }) => {
      closeCodeSheet();
      setBackupCodes(recoveryCodes);
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const copySecretKey = async () => {
    if (!setup) return;
    await Clipboard.setStringAsync(setup.secretKey.replace(/\s/g, ''));
    showToast('Key copied. Paste it in your authenticator app.');
  };

  const openAuthenticatorApp = async () => {
    if (!setup) return;
    try {
      await Linking.openURL(setup.otpauthUrl);
    } catch {
      showToast('No authenticator app found. Install one first, or copy the key.', 'error');
    }
  };

  const confirmTurnOn = async () => {
    const isConfirmed = await confirm({
      title: 'Turn on two-step sign-in?',
      message: 'From now on, signing in will also ask for the 6-digit code from your authenticator app.',
      confirmLabel: 'Yes, turn it on',
      tone: 'success',
      icon: 'shield-checkmark',
    });
    if (isConfirmed) {
      setSetupError(null);
      turnOn.mutate(setupCode);
    }
  };

  const submitActionCode = async () => {
    const code = actionCode.trim();
    if (codeAction === 'turnOff') {
      const isConfirmed = await confirm({
        title: 'Turn off two-step sign-in?',
        message: 'Your account will be protected by your sign-in only. Your backup codes will stop working.',
        confirmLabel: 'Yes, turn it off',
        tone: 'danger',
        icon: 'shield-outline',
      });
      if (isConfirmed) turnOff.mutate(code);
    } else if (codeAction === 'newBackupCodes') {
      const isConfirmed = await confirm({
        title: 'Make new backup codes?',
        message: 'Your old backup codes will stop working.',
        confirmLabel: 'Yes, make new codes',
        icon: 'key',
      });
      if (isConfirmed) createBackupCodes.mutate(code);
    }
  };

  const isActionPending = turnOff.isPending || createBackupCodes.isPending;

  return (
    <Screen header={<ScreenHeader title="Two-step sign-in" showBackButton />}>
      {backupCodes ? (
        <BackupCodesCard codes={backupCodes} onDone={() => setBackupCodes(null)} />
      ) : setup ? (
        <>
          <SetupStep number={1} title="Get an authenticator app">
            <AppText variant="caption" className="text-ink-muted">
              Install a free app such as Google Authenticator or Microsoft Authenticator from the Play Store or App Store.
            </AppText>
          </SetupStep>

          <SetupStep number={2} title="Add AquaTap to the app">
            <Button label="Open my authenticator app" icon="open-outline" fullWidth onPress={() => void openAuthenticatorApp()} />
            <View className="gap-1 rounded-field bg-canvas p-4">
              <AppText variant="overline">Or type this key in the app</AppText>
              <AppText variant="bodyStrong" className="font-heading tracking-[1px]" selectable>
                {setup.secretKey}
              </AppText>
            </View>
            <Button label="Copy the key" icon="copy-outline" variant="secondary" fullWidth onPress={() => void copySecretKey()} />
            <View className="items-center gap-2">
              <AppText variant="overline">Or scan this with another phone</AppText>
              <Image
                source={{ uri: setup.qrCodeDataUri }}
                accessibilityLabel="QR code for the authenticator app"
                className="h-[190px] w-[190px] rounded-field bg-surface"
              />
            </View>
          </SetupStep>

          <SetupStep number={3} title="Type the 6 numbers from the app">
            <CodeField
              label="6-digit code"
              value={setupCode}
              onChangeText={(code) => {
                setSetupCode(code);
                setSetupError(null);
              }}
              errorText={setupError}
            />
            <Button
              label="Turn on two-step sign-in"
              icon="shield-checkmark-outline"
              size="lg"
              fullWidth
              isLoading={turnOn.isPending}
              isDisabled={setupCode.length !== 6}
              onPress={() => void confirmTurnOn()}
            />
            <Button label="Cancel" variant="ghost" fullWidth onPress={() => setSetup(null)} />
          </SetupStep>
        </>
      ) : (
        <>
          <Card className="items-center gap-3 py-6">
            <View className={cn('h-16 w-16 items-center justify-center rounded-full', isEnabled ? 'bg-success-soft' : 'bg-neutral-soft')}>
              <Icon name="shield-checkmark" size={34} color={isEnabled ? colors.success : colors.textSubtle} />
            </View>
            <Badge label={isEnabled ? 'On' : 'Off'} tone={isEnabled ? 'success' : 'neutral'} showDot />
            <AppText variant="title" className="text-center">
              {isEnabled ? 'Your account has extra protection' : 'Add extra protection'}
            </AppText>
            <AppText className="text-center text-ink-muted">
              {isEnabled
                ? 'Signing in asks for a 6-digit code from your authenticator app, so other people cannot open your account even if they know your password.'
                : 'When this is on, signing in also asks for a 6-digit code from an app on your phone. Other people cannot open your account even if they know your password.'}
            </AppText>
            {!isEnabled ? (
              <Button
                label="Set up two-step sign-in"
                icon="shield-checkmark-outline"
                size="lg"
                fullWidth
                isLoading={startSetup.isPending}
                onPress={() => startSetup.mutate()}
              />
            ) : null}
          </Card>

          {isEnabled ? (
            <>
              <SectionHeader title="Options" />
              <ListGroup>
                <ListRow
                  title="Get new backup codes"
                  subtitle="For signing in when you do not have your phone"
                  icon="key-outline"
                  onPress={() => setCodeAction('newBackupCodes')}
                />
                <ListRow
                  title="Turn off two-step sign-in"
                  subtitle="Signing in will no longer ask for a code"
                  icon="shield-outline"
                  iconTone="danger"
                  onPress={() => setCodeAction('turnOff')}
                />
              </ListGroup>
            </>
          ) : (
            <Banner
              tone="info"
              title="What you need"
              message="A phone with an authenticator app (Google Authenticator or Microsoft Authenticator). It is free."
            />
          )}
        </>
      )}

      <BottomSheet
        isVisible={codeAction !== null}
        title={codeAction === 'turnOff' ? 'Turn off two-step sign-in' : 'Get new backup codes'}
        subtitle="Type the 6-digit code from your authenticator app, or one backup code."
        onClose={closeCodeSheet}
        footer={
          <Button
            label="Continue"
            variant={codeAction === 'turnOff' ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            isLoading={isActionPending}
            isDisabled={actionCode.trim().length < 6}
            onPress={() => void submitActionCode()}
          />
        }
      >
        <TextField
          label="Code"
          value={actionCode}
          onChangeText={(code) => {
            setActionCode(code);
            setActionError(null);
          }}
          placeholder="123456 or XXXX-XXXX"
          autoCapitalize="characters"
          autoCorrect={false}
          leftIcon="keypad-outline"
          errorText={actionError}
        />
      </BottomSheet>
    </Screen>
  );
}
