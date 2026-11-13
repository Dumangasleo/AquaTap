import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ordersApi, type StationOrderFilter } from '../../api/aquatap-api';
import { OrderCard } from '../../components/orders/OrderCard';
import {
  AppText,
  Avatar,
  Banner,
  EmptyState,
  ErrorView,
  HeroHeader,
  LoadingView,
  Screen,
  SegmentedControl,
  type IconName,
} from '../../components/ui';
import { appConfig } from '../../config/app-config';
import { ShiftCard } from '../../features/staff/ShiftCard';
import { usePendingCount } from '../../features/staff/use-staff-queries';
import { StationVerificationBanner } from '../../features/station-verification/StationVerificationBanner';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import type { OrderStatus } from '../../types/api.types';
import { todayDateOnly } from '../../utils/format';

type BoardTab = 'pending' | 'active' | 'done';

const CLOSED_STATUSES: OrderStatus[] = ['Delivered', 'Declined', 'Cancelled', 'Failed'];

const EMPTY_MESSAGES: Record<BoardTab, { title: string; message: string; icon: IconName }> = {
  pending: {
    title: 'No orders waiting',
    message: 'New orders from customers show here right away.',
    icon: 'checkmark-done-circle-outline',
  },
  active: {
    title: 'Nothing on the way',
    message: 'Accept a waiting order to start a delivery.',
    icon: 'bicycle-outline',
  },
  done: {
    title: 'Nothing finished today yet',
    message: 'Orders of today that were delivered, declined or not delivered show here.',
    icon: 'today-outline',
  },
};

function buildFilter(tab: BoardTab): StationOrderFilter {
  if (tab === 'pending') return { statuses: ['Pending'] };
  if (tab === 'active') return { statuses: ['Accepted'] };
  return { statuses: CLOSED_STATUSES, date: todayDateOnly() };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Orders board: answer waiting orders, follow deliveries on the way, see today's finished orders. */
export default function StaffOrdersScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const [selectedTab, setSelectedTab] = useState<BoardTab>('pending');
  const filter = useMemo(() => buildFilter(selectedTab), [selectedTab]);

  const pendingCountQuery = usePendingCount();
  const ordersQuery = useQuery({
    queryKey: queryKeys.stationOrders(JSON.stringify(filter)),
    queryFn: () => ordersApi.listStationOrders(filter),
    refetchInterval: appConfig.orderPollingIntervalMs,
  });

  const pendingCount = pendingCountQuery.data?.pendingCount ?? 0;
  const myActiveCount = pendingCountQuery.data?.myActiveCount ?? 0;
  const orders = ordersQuery.data ?? [];

  const handleRefresh = () => {
    void pendingCountQuery.refetch();
    void ordersQuery.refetch();
  };

  return (
    <Screen edges={[]} contentClassName="gap-0 p-0 pb-8" isRefreshing={ordersQuery.isRefetching} onRefresh={handleRefresh}>
      <HeroHeader className="pb-12">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <AppText variant="overline" className="text-on-brand/85" numberOfLines={1}>
              {profile?.waterStation?.stationName ?? 'AquaTap'}
            </AppText>
            <AppText variant="caption" className="text-on-brand/85">
              {getGreeting()},
            </AppText>
            <AppText variant="title" className="text-on-brand" numberOfLines={1}>
              {profile?.fullName ?? 'Staff'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open my profile"
            onPress={() => router.push('/profile')}
            className="rounded-full border-2 border-surface/60"
          >
            <Avatar fullName={profile?.fullName} imageUri={profile?.avatarImage} size={52} />
          </Pressable>
        </View>
      </HeroHeader>

      <View className="-mt-7 gap-4 px-4">
        <ShiftCard />

        <StationVerificationBanner />

        {pendingCount > 0 ? (
          <Banner
            tone="danger"
            icon="notifications"
            title={`${pendingCount} order${pendingCount > 1 ? 's' : ''} waiting for your answer`}
            message="Open an order to accept or decline it. The customer is waiting."
          />
        ) : null}

        <SegmentedControl<BoardTab>
          value={selectedTab}
          onChange={setSelectedTab}
          options={[
            { value: 'pending', label: 'Waiting', count: pendingCount, countTone: 'danger' },
            { value: 'active', label: 'On the way', count: myActiveCount, countTone: 'primary' },
            { value: 'done', label: 'Done today' },
          ]}
        />

        {ordersQuery.isLoading ? (
          <LoadingView message="Loading orders…" />
        ) : ordersQuery.isError ? (
          <ErrorView error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState {...EMPTY_MESSAGES[selectedTab]} />
        ) : (
          <View className="gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.customerOrderId}
                order={order}
                showCustomer
                onPress={() => router.push(`/orders/${order.customerOrderId}`)}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
