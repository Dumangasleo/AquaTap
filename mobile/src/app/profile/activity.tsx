import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { accountApi } from '../../api/aquatap-api';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  LoadingView,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '../../components/ui';
import { activityCategoryDetails, activityFilterOptions } from '../../features/profile/profile-labels';
import { queryKeys } from '../../hooks/query-keys';
import { toneClasses, toneColors } from '../../theme/tokens';
import type { AccountActivity, ActivityCategory } from '../../types/api.types';
import { cn } from '../../utils/cn';
import { formatDate, formatTime } from '../../utils/format';

const PAGE_SIZE = 30;

type ActivityFilter = ActivityCategory | 'All';

/** Groups the activity by day ("Nov 10, 2026") while keeping the newest first. */
function groupByDay(activities: AccountActivity[]): { day: string; items: AccountActivity[] }[] {
  const groups: { day: string; items: AccountActivity[] }[] = [];
  for (const activity of activities) {
    const day = formatDate(activity.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.day === day) lastGroup.items.push(activity);
    else groups.push({ day, items: [activity] });
  }
  return groups;
}

function ActivityRow({ activity, isLast }: { activity: AccountActivity; isLast: boolean }) {
  const details = activityCategoryDetails[activity.activityCategory] ?? activityCategoryDetails.Profile;

  return (
    <View className={cn('flex-row gap-3 py-3', !isLast && 'border-b border-line')}>
      <View className={cn('h-10 w-10 items-center justify-center rounded-[14px]', toneClasses[details.tone].background)}>
        <Icon name={details.icon} size={20} color={toneColors[details.tone].foreground} />
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong">{activity.description}</AppText>
        <AppText variant="caption" className="text-ink-subtle">
          {formatTime(activity.createdAt)}
          {activity.deviceName ? ` · ${activity.deviceName}` : ''}
        </AppText>
      </View>
    </View>
  );
}

/** Everything that was done with the account, newest first. */
export default function AccountActivityScreen() {
  const [filter, setFilter] = useState<ActivityFilter>('All');

  const activityQuery = useInfiniteQuery({
    queryKey: queryKeys.accountActivity(filter),
    queryFn: ({ pageParam }) =>
      accountApi.listActivity({
        limit: PAGE_SIZE,
        beforeId: pageParam ?? undefined,
        category: filter === 'All' ? undefined : filter,
      }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextBeforeId,
  });

  const activities = activityQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const days = groupByDay(activities);

  return (
    <Screen
      header={<ScreenHeader title="Account history" subtitle="What was done with your account" showBackButton />}
      isRefreshing={activityQuery.isRefetching && !activityQuery.isFetchingNextPage}
      onRefresh={() => void activityQuery.refetch()}
    >
      <SegmentedControl<ActivityFilter> isScrollable value={filter} onChange={setFilter} options={activityFilterOptions} />

      {activityQuery.isLoading ? <LoadingView /> : null}
      {activityQuery.isError ? <ErrorView error={activityQuery.error} onRetry={() => void activityQuery.refetch()} /> : null}

      {activityQuery.isSuccess && activities.length === 0 ? (
        <Card>
          <EmptyState icon="time-outline" title="Nothing here yet" message="Orders, payments and sign-ins of your account will be listed here." />
        </Card>
      ) : null}

      {days.map((group) => (
        <View key={group.day} className="gap-2">
          <AppText variant="overline" className="px-1">
            {group.day}
          </AppText>
          <Card className="py-1">
            {group.items.map((activity, index) => (
              <ActivityRow key={activity.accountActivityId} activity={activity} isLast={index === group.items.length - 1} />
            ))}
          </Card>
        </View>
      ))}

      {activityQuery.hasNextPage ? (
        <Button
          label="Show older history"
          icon="chevron-down"
          variant="outline"
          fullWidth
          isLoading={activityQuery.isFetchingNextPage}
          onPress={() => void activityQuery.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
