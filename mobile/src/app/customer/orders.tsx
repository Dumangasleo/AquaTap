import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ordersApi, type CustomerOrderFilter } from '../../api/aquatap-api';
import { OrderCard } from '../../components/orders/OrderCard';
import {
  Banner,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  ScreenHeader,
  SegmentedControl,
} from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import { formatCurrency } from '../../utils/format';

type OrderFilter = 'all' | 'active' | 'unpaid' | 'paid' | 'cancelled';

const FILTERS: Record<OrderFilter, CustomerOrderFilter> = {
  all: {},
  active: { statuses: ['Pending', 'Accepted'] },
  unpaid: { statuses: ['Delivered'], paymentType: 'Credit', paymentStatus: 'Unpaid' },
  paid: { statuses: ['Delivered'], paymentStatus: 'Paid' },
  cancelled: { statuses: ['Declined', 'Cancelled', 'Failed'] },
};

const EMPTY_MESSAGES: Record<OrderFilter, string> = {
  all: 'Your orders will appear here.',
  active: 'You have no orders waiting or on the way.',
  unpaid: 'You have no orders waiting to be paid. Salamat!',
  paid: 'No paid orders yet.',
  cancelled: 'No cancelled or declined orders.',
};

/** Customer's own record: every order, cash or utang, with filters (e.g. unpaid only). */
export default function CustomerOrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: OrderFilter }>();
  const [filter, setFilter] = useState<OrderFilter>(params.filter && params.filter in FILTERS ? params.filter : 'all');

  const ordersQuery = useQuery({
    queryKey: queryKeys.myOrders(filter),
    queryFn: () => ordersApi.listMyOrders(FILTERS[filter]),
  });
  const orders = ordersQuery.data ?? [];
  const unpaidTotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <Screen
      header={<ScreenHeader title="My orders" subtitle="Your delivery history and payments" />}
      isRefreshing={ordersQuery.isRefetching}
      onRefresh={() => void ordersQuery.refetch()}
      contentClassName="pt-1"
    >
      <SegmentedControl<OrderFilter>
        isScrollable
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'On the way' },
          { value: 'unpaid', label: 'Not yet paid' },
          { value: 'paid', label: 'Paid' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />

      {filter === 'unpaid' && orders.length > 0 ? (
        <Banner
          tone="warning"
          icon="wallet-outline"
          title={`You still owe ${formatCurrency(unpaidTotal)}`}
          message="Pay the rider in cash, or send it by GCash or bank. Then open the order and send your reference no."
        />
      ) : null}

      {ordersQuery.isLoading ? <LoadingView /> : null}
      {ordersQuery.isError ? <ErrorView error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} /> : null}
      {!ordersQuery.isLoading && orders.length === 0 ? <EmptyState icon="receipt-outline" title="No orders here" message={EMPTY_MESSAGES[filter]} /> : null}

      {orders.map((order) => (
        <OrderCard key={order.customerOrderId} order={order} onPress={() => router.push(`/orders/${order.customerOrderId}`)} />
      ))}
    </Screen>
  );
}
