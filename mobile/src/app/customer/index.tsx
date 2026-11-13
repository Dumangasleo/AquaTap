import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { customersApi, ordersApi } from '../../api/aquatap-api';
import { OrderCard } from '../../components/orders/OrderCard';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorView,
  HeroHeader,
  Icon,
  LoadingView,
  Screen,
  SectionHeader,
  StatCard,
} from '../../components/ui';
import { appConfig } from '../../config/app-config';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import { formatCurrency } from '../../utils/format';

/** One small number inside the blue header ("BORROWED 3"). */
function GallonFigure({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center rounded-[16px] bg-surface/15 px-2 py-2.5">
      <AppText className="font-display text-[20px] leading-[26px] text-on-brand">{value}</AppText>
      <AppText variant="overline" className="text-[11px] text-on-brand/85">
        {label}
      </AppText>
    </View>
  );
}

export default function CustomerHomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);

  const accountQuery = useQuery({ queryKey: queryKeys.myAccount, queryFn: customersApi.getMyAccount });
  const activeOrdersQuery = useQuery({
    queryKey: queryKeys.myOrders('active'),
    queryFn: () => ordersApi.listMyOrders({ statuses: ['Pending', 'Accepted'] }),
    refetchInterval: appConfig.orderPollingIntervalMs,
  });
  const recentOrdersQuery = useQuery({
    queryKey: queryKeys.myOrders('recent'),
    queryFn: () => ordersApi.listMyOrders({ statuses: ['Delivered', 'Declined', 'Cancelled', 'Failed'] }),
  });

  const refreshAll = () => {
    void accountQuery.refetch();
    void activeOrdersQuery.refetch();
    void recentOrdersQuery.refetch();
  };

  const account = accountQuery.data;
  const activeOrders = activeOrdersQuery.data ?? [];
  const recentOrders = (recentOrdersQuery.data ?? []).slice(0, 3);
  const fullName = account?.fullName ?? profile?.fullName;
  const firstName = fullName?.split(' ')[0] ?? 'there';

  return (
    <Screen edges={[]} contentClassName="gap-0 p-0 pb-8" isRefreshing={accountQuery.isRefetching} onRefresh={refreshAll}>
      <HeroHeader className="pb-12">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <AppText variant="overline" className="text-on-brand/85" numberOfLines={1}>
              {profile?.waterStation?.stationName ?? 'AquaTap'}
            </AppText>
            <AppText variant="display" className="text-on-brand" numberOfLines={1}>
              Hi, {firstName}!
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open my profile"
            onPress={() => router.push('/profile')}
            className="rounded-full border-2 border-surface/60"
          >
            <Avatar fullName={fullName} imageUri={profile?.avatarImage} size={48} />
          </Pressable>
        </View>

        {account ? (
          <View
            className="gap-3"
            accessible
            accessibilityLabel={`You have ${account.gallonBalance.remainingGallons} gallons of the station with you`}
          >
            <View className="flex-row items-end gap-3">
              <AppText className="font-display text-[64px] leading-[68px] text-on-brand">
                {account.gallonBalance.remainingGallons}
              </AppText>
              <View className="flex-1 pb-2.5">
                <AppText variant="overline" className="text-on-brand/85">
                  Gallons with you
                </AppText>
                <AppText variant="caption" className="text-on-brand/85">
                  Containers of the station that are in your house now
                </AppText>
              </View>
            </View>
            <View className="flex-row gap-2">
              <GallonFigure label="Borrowed" value={account.gallonBalance.borrowedGallons} />
              <GallonFigure label="Delivered" value={account.gallonBalance.gallonsDelivered} />
              <GallonFigure label="Returned" value={account.gallonBalance.gallonsReturned} />
            </View>
          </View>
        ) : null}
      </HeroHeader>

      <View className="-mt-7 gap-4 px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Order water"
          onPress={() => router.push('/orders/new')}
          className="flex-row items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-md shadow-brand-deep/10 active:bg-surface-muted"
        >
          <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-brand">
            <Icon name="water" size={30} color={colors.textOnPrimary} />
          </View>
          <View className="flex-1">
            <AppText variant="heading">Order water</AppText>
            <AppText variant="caption" className="text-ink-muted">
              We deliver to your pinned address
            </AppText>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-soft">
            <Icon name="arrow-forward" size={20} color={colors.primary} />
          </View>
        </Pressable>

        {accountQuery.isLoading ? <LoadingView /> : null}
        {accountQuery.isError ? <ErrorView error={accountQuery.error} onRetry={refreshAll} /> : null}

        {account ? (
          <>
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                label="Your utang"
                value={formatCurrency(account.credit.unpaidBalance)}
                icon="wallet-outline"
                tone={account.credit.unpaidBalance > 0 ? 'warning' : 'success'}
                caption={
                  account.credit.unpaidOrderCount > 0
                    ? `${account.credit.unpaidOrderCount} order(s) not yet paid`
                    : 'All paid. Salamat!'
                }
              />
              <StatCard
                label="All orders"
                value={String(account.totalOrders)}
                icon="receipt-outline"
                tone="info"
                caption={`${account.activeOrders} in progress`}
              />
            </View>

            {account.credit.unpaidBalance > 0 ? (
              <Button
                label="See orders not yet paid"
                icon="time-outline"
                variant="outline"
                onPress={() => router.push({ pathname: '/customer/orders', params: { filter: 'unpaid' } })}
              />
            ) : null}
          </>
        ) : null}

        <SectionHeader title="Orders in progress" />
        {activeOrders.length === 0 && !activeOrdersQuery.isLoading ? (
          <Card>
            <EmptyState
              icon="bicycle-outline"
              title="No orders right now"
              message="Tap “Order water” and the station will bring it to your house."
            />
          </Card>
        ) : null}
        {activeOrders.map((order) => (
          <OrderCard key={order.customerOrderId} order={order} onPress={() => router.push(`/orders/${order.customerOrderId}`)} />
        ))}

        {recentOrders.length > 0 ? (
          <>
            <SectionHeader
              title="Past orders"
              action={<Button label="See all" variant="ghost" size="sm" onPress={() => router.push('/customer/orders')} />}
            />
            {recentOrders.map((order) => (
              <OrderCard key={order.customerOrderId} order={order} onPress={() => router.push(`/orders/${order.customerOrderId}`)} />
            ))}
          </>
        ) : null}
      </View>
    </Screen>
  );
}
