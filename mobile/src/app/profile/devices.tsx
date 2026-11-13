import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { accountApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  useConfirm,
  useToast,
} from '../../components/ui';
import { devicePlatformIcons, signInMethodLabels } from '../../features/profile/profile-labels';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import type { UserSession } from '../../types/api.types';
import { formatDateTime, formatRelativeTime } from '../../utils/format';

/** One phone or computer where the account is signed in. */
function DeviceCard({ session, onSignOut, isSigningOut }: { session: UserSession; onSignOut: () => void; isSigningOut: boolean }) {
  return (
    <Card className="gap-3" highlightColor={session.isCurrent ? colors.primary : undefined}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-[16px] bg-brand-soft">
          <Icon name={devicePlatformIcons[session.platform]} size={24} color={colors.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText variant="heading" numberOfLines={1}>
            {session.deviceName}
          </AppText>
          <AppText variant="caption" className="text-ink-muted">
            {signInMethodLabels[session.signInMethod]}
          </AppText>
        </View>
        {session.isCurrent ? <Badge label="This device" tone="success" showDot /> : null}
      </View>

      <View className="flex-row gap-4 rounded-field bg-canvas p-3">
        <View className="flex-1">
          <AppText variant="overline">Last used</AppText>
          <AppText variant="label">{session.isCurrent ? 'Now' : formatRelativeTime(session.lastActiveAt)}</AppText>
        </View>
        <View className="flex-1">
          <AppText variant="overline">Signed in</AppText>
          <AppText variant="label">{formatDateTime(session.signedInAt)}</AppText>
        </View>
      </View>
      {session.ipAddress ? (
        <AppText variant="tiny" className="text-ink-subtle">
          Internet address: {session.ipAddress}
        </AppText>
      ) : null}

      {!session.isCurrent ? (
        <Button
          label="Sign out this device"
          icon="log-out-outline"
          variant="outline"
          fullWidth
          isLoading={isSigningOut}
          onPress={onSignOut}
        />
      ) : null}
    </Card>
  );
}

export default function DevicesScreen() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const sessionsQuery = useQuery({ queryKey: queryKeys.accountSessions, queryFn: accountApi.listSessions });
  const sessions = sessionsQuery.data ?? [];
  const otherSessions = sessions.filter((session) => !session.isCurrent);
  const refreshSessions = () => queryClient.invalidateQueries({ queryKey: queryKeys.accountSessions });
  const showError = (error: unknown) => showToast(getErrorMessage(error), 'error');

  const signOutDevice = useMutation({
    mutationFn: (userSessionId: number) => accountApi.signOutSession(userSessionId),
    onSuccess: () => {
      void refreshSessions();
      showToast('That device was signed out');
    },
    onError: showError,
  });

  const signOutOthers = useMutation({
    mutationFn: accountApi.signOutOtherSessions,
    onSuccess: ({ signedOutCount }) => {
      void refreshSessions();
      showToast(`${signedOutCount} device${signedOutCount === 1 ? '' : 's'} signed out`);
    },
    onError: showError,
  });

  const confirmSignOutDevice = async (session: UserSession) => {
    const isConfirmed = await confirm({
      title: 'Sign out this device?',
      message: 'It will need to sign in again to use your account.',
      details: [
        { label: 'Device', value: session.deviceName },
        { label: 'Last used', value: formatRelativeTime(session.lastActiveAt) },
      ],
      confirmLabel: 'Yes, sign it out',
      tone: 'danger',
      icon: 'log-out-outline',
    });
    if (isConfirmed) signOutDevice.mutate(session.userSessionId);
  };

  const confirmSignOutOthers = async () => {
    const isConfirmed = await confirm({
      title: 'Sign out all other devices?',
      message: 'Only this phone stays signed in.',
      details: [{ label: 'Devices', value: String(otherSessions.length) }],
      confirmLabel: 'Yes, sign them out',
      tone: 'danger',
      icon: 'log-out-outline',
    });
    if (isConfirmed) signOutOthers.mutate();
  };

  return (
    <Screen
      header={<ScreenHeader title="Devices" subtitle="Where your account is signed in" showBackButton />}
      isRefreshing={sessionsQuery.isRefetching}
      onRefresh={() => void sessionsQuery.refetch()}
    >
      {sessionsQuery.isLoading ? <LoadingView /> : null}
      {sessionsQuery.isError ? <ErrorView error={sessionsQuery.error} onRetry={() => void sessionsQuery.refetch()} /> : null}

      {sessionsQuery.isSuccess ? (
        <>
          <Banner
            tone="info"
            icon="shield-checkmark"
            title="See a device you do not know?"
            message="Sign it out, then change your password."
          />

          {sessions
            .filter((session) => session.isCurrent)
            .map((session) => (
              <DeviceCard key={session.userSessionId} session={session} onSignOut={() => undefined} isSigningOut={false} />
            ))}

          <SectionHeader title={`Other devices (${otherSessions.length})`} />
          {otherSessions.length === 0 ? (
            <Card>
              <EmptyState icon="phone-portrait-outline" title="No other devices" message="Your account is signed in on this device only." />
            </Card>
          ) : null}
          {otherSessions.map((session) => (
            <DeviceCard
              key={session.userSessionId}
              session={session}
              onSignOut={() => void confirmSignOutDevice(session)}
              isSigningOut={signOutDevice.isPending && signOutDevice.variables === session.userSessionId}
            />
          ))}

          {otherSessions.length > 1 ? (
            <Button
              label="Sign out all other devices"
              icon="log-out-outline"
              variant="danger"
              fullWidth
              isLoading={signOutOthers.isPending}
              onPress={() => void confirmSignOutOthers()}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
