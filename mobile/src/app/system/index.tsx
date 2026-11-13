import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { stationReviewsApi } from '../../api/aquatap-api';
import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  IconButton,
  LoadingView,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '../../components/ui';
import { verificationStatusDetails } from '../../features/station-verification/kyb-labels';
import { queryKeys } from '../../hooks/query-keys';
import { useSignOut } from '../../hooks/use-sign-out';
import { colors } from '../../theme/tokens';
import type { StationVerificationStatus } from '../../types/api.types';
import { formatDateTime } from '../../utils/format';

/** Review queue of station business documents (oldest submission first). */
export default function StationReviewQueueScreen() {
  const router = useRouter();
  const signOut = useSignOut();
  const [statusFilter, setStatusFilter] = useState<StationVerificationStatus>('UnderReview');

  const stationsQuery = useQuery({
    queryKey: queryKeys.stationReviews(statusFilter),
    queryFn: () => stationReviewsApi.list(statusFilter),
    refetchInterval: 30_000,
  });
  const underReviewCountQuery = useQuery({
    queryKey: queryKeys.stationReviews('UnderReview'),
    queryFn: () => stationReviewsApi.list('UnderReview'),
  });
  const stations = stationsQuery.data ?? [];

  return (
    <Screen
      isRefreshing={stationsQuery.isRefetching}
      onRefresh={() => void stationsQuery.refetch()}
      header={
        <ScreenHeader
          title="Business checks"
          subtitle="AquaTap reviewer · station documents"
          rightAction={
            <View className="flex-row gap-2">
              <IconButton icon="person-circle-outline" accessibilityLabel="My profile" onPress={() => router.push('/profile')} />
              <IconButton icon="log-out-outline" accessibilityLabel="Sign out" onPress={() => void signOut()} />
            </View>
          }
        />
      }
    >
      <SegmentedControl<StationVerificationStatus>
        isScrollable
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'UnderReview', label: 'To review', count: underReviewCountQuery.data?.length, countTone: 'danger' },
          { value: 'Verified', label: 'Approved' },
          { value: 'Rejected', label: 'Needs changes' },
          { value: 'NotSubmitted', label: 'Not sent yet' },
        ]}
      />

      {stationsQuery.isLoading ? <LoadingView /> : null}
      {stationsQuery.isError ? <ErrorView error={stationsQuery.error} onRetry={() => void stationsQuery.refetch()} /> : null}
      {!stationsQuery.isLoading && stations.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="Nothing here" message="No stations to show for this filter." />
      ) : null}

      {stations.map((station) => {
        const details = verificationStatusDetails[station.verificationStatus];
        return (
          <Card
            key={station.waterStationId}
            onPress={() => router.push(`/system/stations/${station.waterStationId}`)}
            accessibilityLabel={`Review ${station.stationName}`}
            className="gap-3"
          >
            <View className="flex-row items-center gap-2">
              <View className="flex-1 gap-0.5">
                <AppText variant="heading">{station.stationName}</AppText>
                <AppText variant="caption" className="text-ink-muted">
                  {station.registeredBusinessName ?? 'No registered name yet'} · TIN {station.taxIdentificationNumber ?? '—'}
                </AppText>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textSubtle} />
            </View>
            <AppText variant="caption" className="text-ink-muted">
              Owner: {station.ownerFullName ?? '—'} ({station.ownerEmail ?? '—'})
            </AppText>
            <View className="flex-row flex-wrap gap-1.5">
              <Badge label={details.label} tone={details.tone} icon={details.icon} />
              <Badge
                label={`${station.requiredDocumentTypes.length - station.missingDocumentTypes.length}/${station.requiredDocumentTypes.length} documents`}
                tone={station.missingDocumentTypes.length === 0 ? 'success' : 'warning'}
              />
              {station.verificationSubmittedAt ? <Badge label={`Sent ${formatDateTime(station.verificationSubmittedAt)}`} tone="neutral" /> : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
