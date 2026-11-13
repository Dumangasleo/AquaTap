import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ordersApi } from '../../api/aquatap-api';
import { ErrorView, LoadingView, Screen, ScreenHeader } from '../../components/ui';
import { appConfig } from '../../config/app-config';
import { CustomerOrderView } from '../../features/order-detail/CustomerOrderView';
import { StaffOrderView } from '../../features/order-detail/StaffOrderView';
import { queryKeys } from '../../hooks/query-keys';
import { isStaffRole, useAuthStore } from '../../store/auth-store';
import type { CustomerOrder } from '../../types/api.types';

const isOrderActive = (order: CustomerOrder | undefined) =>
  order?.orderStatus === 'Pending' || order?.orderStatus === 'Accepted';

/** One order, shared by customers (tracking) and staff (accept, deliver). */
export default function OrderDetailScreen() {
  const { customerOrderId } = useLocalSearchParams<{ customerOrderId: string }>();
  const orderId = Number(customerOrderId);
  const profile = useAuthStore((state) => state.profile);

  const orderQuery = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Number.isFinite(orderId),
    refetchInterval: (query) => (isOrderActive(query.state.data) ? appConfig.orderPollingIntervalMs : false),
  });

  if (orderQuery.isLoading || !orderQuery.data) {
    return (
      <Screen header={<ScreenHeader title="Order" showBackButton />}>
        {orderQuery.isError ? (
          <ErrorView error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
        ) : (
          <LoadingView message="Loading order…" />
        )}
      </Screen>
    );
  }

  const viewProps = {
    order: orderQuery.data,
    isRefreshing: orderQuery.isRefetching,
    onRefresh: () => void orderQuery.refetch(),
  };

  return isStaffRole(profile) ? <StaffOrderView {...viewProps} /> : <CustomerOrderView {...viewProps} />;
}
