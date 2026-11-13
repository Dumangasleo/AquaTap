import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { Coordinates, MapMarker, RouteInfo } from '../../components/map/map.types';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { AppText, Avatar, Banner, Button, Card, Icon, Screen, ScreenHeader, useConfirm } from '../../components/ui';
import { useOrderActions } from '../../hooks/use-order-actions';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import type { CustomerOrder } from '../../types/api.types';
import { formatCurrency, formatRelativeTime, paymentTypeLabels } from '../../utils/format';
import { buildDirectionsUrl, getCurrentCoordinates } from '../../utils/location';
import { ReasonSheet } from '../staff/ReasonSheet';
import { DeliverOrderSheet } from './DeliverOrderSheet';
import { OrderSummaryCard } from './OrderSummaryCard';
import { useRiderLocationSharing } from './use-rider-location-sharing';

const DECLINE_REASONS = ['Out of stock', 'Outside delivery area', 'No available rider'];
const FAILED_REASONS = ['Customer not home', 'Wrong address', 'Customer refused the order'];

interface StaffOrderViewProps {
  order: CustomerOrder;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/** Staff side: accept / decline, see where to deliver (map + route), then complete or fail the delivery. */
export function StaffOrderView({ order, isRefreshing, onRefresh }: StaffOrderViewProps) {
  const profile = useAuthStore((state) => state.profile);
  const orderActions = useOrderActions(order.customerOrderId);
  const confirm = useConfirm();
  const [riderPosition, setRiderPosition] = useState<Coordinates | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [visibleSheet, setVisibleSheet] = useState<'decline' | 'deliver' | 'fail' | null>(null);

  const isPending = order.orderStatus === 'Pending';
  const isOnTheWay = order.orderStatus === 'Accepted';
  const canHandleDelivery = isOnTheWay && (order.isAssignedToMe || profile?.role === 'Admin');
  const isMyDelivery = isOnTheWay && order.isAssignedToMe;

  const deliveryPoint =
    order.deliveryLatitude !== null && order.deliveryLongitude !== null
      ? { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }
      : null;

  // Show where the rider is now (for planning the route), then keep it live while delivering.
  useEffect(() => {
    if (!isPending && !isOnTheWay) return;
    let isActive = true;
    void getCurrentCoordinates().then((coordinates) => {
      if (isActive && coordinates) setRiderPosition(coordinates);
    });
    return () => {
      isActive = false;
    };
  }, [isPending, isOnTheWay]);
  useRiderLocationSharing(isMyDelivery, setRiderPosition);

  const showRoute = (isPending || isOnTheWay) && deliveryPoint && riderPosition;
  const markers: MapMarker[] = [
    ...(deliveryPoint ? [{ id: 'customer', kind: 'customer' as const, label: order.customer?.fullName ?? 'Customer', ...deliveryPoint }] : []),
    ...(showRoute && riderPosition ? [{ id: 'rider', kind: 'rider' as const, label: 'You', ...riderPosition }] : []),
  ];

  const closeSheet = () => setVisibleSheet(null);
  const customerName = order.customer?.fullName ?? 'Customer';

  const handleAccept = async () => {
    const isConfirmed = await confirm({
      title: 'Accept this order?',
      message: 'The customer will be told that their order is on the way.',
      details: [
        { label: 'Customer', value: customerName },
        { label: 'Gallons', value: `${order.gallonsOrdered} gallon(s)` },
        { label: 'Total', value: formatCurrency(order.totalAmount) },
        { label: 'Payment', value: paymentTypeLabels[order.paymentType] },
      ],
      confirmLabel: 'Yes, accept order',
      tone: 'success',
      icon: 'checkmark-circle',
    });
    if (isConfirmed) orderActions.accept.mutate();
  };

  const handleDecline = async (reason: string) => {
    const isConfirmed = await confirm({
      title: 'Decline this order?',
      message: 'The customer will see your reason.',
      details: [
        { label: 'Customer', value: customerName },
        { label: 'Total', value: formatCurrency(order.totalAmount) },
        { label: 'Reason', value: reason || 'No reason given' },
      ],
      confirmLabel: 'Yes, decline order',
      tone: 'danger',
      icon: 'close-circle',
    });
    if (isConfirmed) orderActions.decline.mutate(reason, { onSuccess: closeSheet });
  };

  const handleFail = async (reason: string) => {
    const isConfirmed = await confirm({
      title: 'Mark as not delivered?',
      message: 'The order will be saved as not delivered in the transactions of the day.',
      details: [
        { label: 'Customer', value: customerName },
        { label: 'Gallons', value: `${order.gallonsOrdered} gallon(s)` },
        { label: 'Reason', value: reason || 'No reason given' },
      ],
      confirmLabel: 'Yes, not delivered',
      tone: 'danger',
      icon: 'alert-circle',
    });
    if (isConfirmed) orderActions.fail.mutate(reason, { onSuccess: closeSheet });
  };

  const footer = isPending ? (
    <View className="flex-row items-center gap-2">
      <Button label="Decline" icon="close" variant="outline" size="lg" className="flex-1" onPress={() => setVisibleSheet('decline')} />
      <Button
        label="Accept order"
        icon="checkmark"
        variant="success"
        size="lg"
        className="flex-[2]"
        isLoading={orderActions.accept.isPending}
        onPress={() => void handleAccept()}
      />
    </View>
  ) : canHandleDelivery ? (
    <View className="flex-row items-center gap-2">
      <Button label="Not delivered" icon="alert-circle-outline" variant="outline" size="lg" className="flex-1" onPress={() => setVisibleSheet('fail')} />
      <Button label="Mark as delivered" icon="checkmark-done" variant="success" size="lg" className="flex-[2]" onPress={() => setVisibleSheet('deliver')} />
    </View>
  ) : undefined;

  return (
    <Screen
      header={<ScreenHeader title={`Order #${order.orderNumber}`} subtitle={`Ordered ${formatRelativeTime(order.orderedAt).toLowerCase()}`} showBackButton />}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      footer={footer}
    >
      <View className="flex-row items-center justify-between">
        <OrderStatusBadge status={order.orderStatus} />
        <AppText variant="display" className="text-brand">
          {formatCurrency(order.totalAmount)}
        </AppText>
      </View>

      {isPending ? (
        <Banner tone="danger" icon="notifications" title="New order. Please answer." message="Accept to start the delivery, or decline and tell the customer why." />
      ) : null}
      {isOnTheWay && !canHandleDelivery ? (
        <Banner tone="info" icon="person-outline" message={`Being delivered by ${order.handledBy?.fullName ?? 'another employee'}.`} />
      ) : null}
      {isMyDelivery ? (
        <Banner tone="success" icon="navigate" message="The customer can see where you are while you deliver this order." />
      ) : null}

      <Card className="gap-4">
        <View className="flex-row items-center gap-3">
          <Avatar fullName={order.customer?.fullName} />
          <View className="flex-1">
            <AppText variant="heading" numberOfLines={2}>
              {customerName}
            </AppText>
            <AppText variant="caption" className="text-ink-muted">
              {order.customer?.contactNumber}
            </AppText>
          </View>
          {order.customer?.contactNumber ? (
            <Button label="Call" icon="call" variant="secondary" onPress={() => void Linking.openURL(`tel:${order.customer?.contactNumber}`)} />
          ) : null}
        </View>
        <View className="flex-row items-start gap-2">
          <Icon name="location" size={20} color={colors.primary} />
          <View className="flex-1 gap-0.5">
            <AppText>{order.deliveryAddress}</AppText>
            {order.customer?.landmark ? (
              <AppText variant="caption" className="text-ink-muted">
                Landmark: {order.customer.landmark}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>

      {deliveryPoint ? (
        <View className="gap-2">
          <LeafletMap
            markers={markers}
            height={280}
            route={showRoute ? { from: riderPosition!, to: deliveryPoint } : null}
            onRouteInfo={setRouteInfo}
          />
          <View className="flex-row items-center gap-2">
            {showRoute && routeInfo ? (
              <View className="flex-1 flex-row items-center gap-1 rounded-full bg-brand-soft px-3 py-2">
                <Icon name="speedometer-outline" size={18} color={colors.primary} />
                <AppText variant="label" className="text-brand">
                  {routeInfo.distanceKm} km · about {routeInfo.durationMinutes} min
                </AppText>
              </View>
            ) : (
              <View className="flex-1" />
            )}
            <Button
              label="Directions"
              icon="navigate-outline"
              variant="outline"
              onPress={() => void Linking.openURL(buildDirectionsUrl(deliveryPoint))}
              accessibilityHint="Opens Google Maps with turn-by-turn directions"
            />
          </View>
        </View>
      ) : (
        <Banner tone="warning" icon="map-outline" message="The customer did not pin a location. Use the address above or call them." />
      )}

      <OrderSummaryCard order={order} />

      <Card className="gap-3">
        <AppText variant="heading">Order progress</AppText>
        <OrderTimeline order={order} />
      </Card>

      <ReasonSheet
        isVisible={visibleSheet === 'decline'}
        title="Decline this order?"
        subtitle="The customer will be told why."
        quickReasons={DECLINE_REASONS}
        confirmLabel="Decline order"
        isSubmitting={orderActions.decline.isPending}
        onClose={closeSheet}
        onConfirm={(reason) => void handleDecline(reason)}
      />
      <ReasonSheet
        isVisible={visibleSheet === 'fail'}
        title="Could not deliver?"
        subtitle="The order will be saved as not delivered."
        quickReasons={FAILED_REASONS}
        confirmLabel="Mark as not delivered"
        isSubmitting={orderActions.fail.isPending}
        onClose={closeSheet}
        onConfirm={(reason) => void handleFail(reason)}
      />
      <DeliverOrderSheet
        isVisible={visibleSheet === 'deliver'}
        order={order}
        isSubmitting={orderActions.deliver.isPending}
        onClose={closeSheet}
        onConfirm={(request) => orderActions.deliver.mutate(request, { onSuccess: closeSheet })}
      />
    </Screen>
  );
}
