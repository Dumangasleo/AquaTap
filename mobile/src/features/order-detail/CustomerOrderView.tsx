import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { MapMarker, RouteInfo } from '../../components/map/map.types';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge';
import { OrderTimeline } from '../../components/orders/OrderTimeline';
import { AppText, Avatar, Button, Card, Icon, Screen, ScreenHeader, SectionHeader, useConfirm } from '../../components/ui';
import { useOrderActions } from '../../hooks/use-order-actions';
import { ReasonSheet } from '../staff/ReasonSheet';
import { colors } from '../../theme/tokens';
import type { CustomerOrder, OrderStatus } from '../../types/api.types';
import { formatCurrency, formatRelativeTime } from '../../utils/format';
import { OrderSummaryCard } from './OrderSummaryCard';

const STATUS_MESSAGES: Record<OrderStatus, { title: string; message: string }> = {
  Pending: { title: 'Waiting for the station', message: 'Your order was sent. The station will accept it soon.' },
  Accepted: { title: 'Your water is on the way!', message: 'The rider accepted your order and is heading to you.' },
  Delivered: { title: 'Delivered', message: 'Thank you for ordering! Your records are updated.' },
  Declined: { title: 'Order declined', message: 'The station could not take this order.' },
  Cancelled: { title: 'Order cancelled', message: 'You cancelled this order.' },
  Failed: { title: 'Not delivered', message: 'The rider could not deliver this order.' },
};

const CANCEL_REASONS = ['Ordered by mistake', 'Changed my mind', 'Will pick up at the station'];

interface CustomerOrderViewProps {
  order: CustomerOrder;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/** Customer side: track the rider like a food delivery app, see the receipt, cancel or pay. */
export function CustomerOrderView({ order, isRefreshing, onRefresh }: CustomerOrderViewProps) {
  const router = useRouter();
  const orderActions = useOrderActions(order.customerOrderId);
  const confirm = useConfirm();
  const [isCancelSheetVisible, setIsCancelSheetVisible] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const statusMessage = STATUS_MESSAGES[order.orderStatus];
  const rider = order.handledBy;
  const isOnTheWay = order.orderStatus === 'Accepted';
  const hasDeliveryPin = order.deliveryLatitude !== null && order.deliveryLongitude !== null;
  const hasRiderLocation = isOnTheWay && rider?.lastLatitude != null && rider.lastLongitude != null;

  const deliveryPoint = hasDeliveryPin ? { latitude: order.deliveryLatitude!, longitude: order.deliveryLongitude! } : null;
  const riderPoint = hasRiderLocation ? { latitude: rider!.lastLatitude!, longitude: rider!.lastLongitude! } : null;

  const markers: MapMarker[] = [
    ...(deliveryPoint ? [{ id: 'customer', kind: 'customer' as const, label: 'You', ...deliveryPoint }] : []),
    ...(riderPoint ? [{ id: 'rider', kind: 'rider' as const, label: 'Rider', ...riderPoint }] : []),
  ];

  const isClosedWithoutDelivery = ['Declined', 'Cancelled', 'Failed'].includes(order.orderStatus);
  const canPayOnline =
    order.paymentStatus === 'Unpaid' &&
    !isClosedWithoutDelivery &&
    (order.paymentType === 'Credit' ? order.orderStatus === 'Delivered' : order.paymentMode !== 'Cash');
  const canCancel = order.orderStatus === 'Pending';

  const cancelOrder = async (reason: string) => {
    setIsCancelSheetVisible(false);
    const isConfirmed = await confirm({
      title: 'Cancel this order?',
      message: 'The station will not deliver it. This cannot be undone.',
      details: [
        { label: 'Order', value: `#${order.orderNumber}` },
        { label: 'Gallons', value: `${order.gallonsOrdered} ${order.gallonsOrdered === 1 ? 'gallon' : 'gallons'}` },
        { label: 'Total', value: formatCurrency(order.totalAmount) },
        ...(reason ? [{ label: 'Reason', value: reason }] : []),
      ],
      confirmLabel: 'Yes, cancel order',
      cancelLabel: 'No, keep my order',
      tone: 'danger',
    });
    if (isConfirmed) orderActions.cancel.mutate(reason || undefined);
  };

  const footer =
    canPayOnline || canCancel ? (
      <>
        {canPayOnline ? (
          <Button
            label="Pay with GCash or bank"
            icon="qr-code-outline"
            size="lg"
            fullWidth
            onPress={() => router.push(`/pay?customerOrderId=${order.customerOrderId}`)}
          />
        ) : null}
        {canCancel ? (
          <Button label="Cancel order" icon="close-circle-outline" variant="outline" fullWidth onPress={() => setIsCancelSheetVisible(true)} />
        ) : null}
      </>
    ) : undefined;

  return (
    <Screen
      header={<ScreenHeader title={`Order #${order.orderNumber}`} showBackButton />}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh}
      footer={footer}
    >
      <Card className="gap-2">
        <OrderStatusBadge status={order.orderStatus} />
        <AppText variant="title">{statusMessage.title}</AppText>
        <AppText className="text-ink-muted">{statusMessage.message}</AppText>
        {isOnTheWay && routeInfo ? (
          <View className="flex-row items-center gap-2 rounded-field bg-brand-soft p-3">
            <Icon name="bicycle" size={22} color={colors.primary} />
            <AppText variant="bodyStrong" className="flex-1 text-brand">
              Rider is about {routeInfo.distanceKm} km ({routeInfo.durationMinutes} min) away
            </AppText>
          </View>
        ) : null}
      </Card>

      {markers.length > 0 ? (
        <View className="gap-1">
          <LeafletMap
            markers={markers}
            height={isOnTheWay ? 300 : 200}
            route={deliveryPoint && riderPoint ? { from: riderPoint, to: deliveryPoint } : null}
            onRouteInfo={setRouteInfo}
          />
          {isOnTheWay ? (
            <AppText variant="caption" className="text-ink-subtle">
              {rider?.lastLocationAt
                ? `Rider location updated ${formatRelativeTime(rider.lastLocationAt).toLowerCase()}`
                : 'Waiting for the rider to share their location…'}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {rider && (isOnTheWay || order.orderStatus === 'Delivered') ? (
        <Card className="flex-row items-center gap-3">
          <Avatar fullName={rider.fullName} />
          <View className="flex-1 gap-0.5">
            <AppText variant="overline">{isOnTheWay ? 'Your rider' : 'Delivered by'}</AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {rider.fullName}
            </AppText>
          </View>
          {rider.contactNumber && isOnTheWay ? (
            <Button label="Call" icon="call" variant="secondary" onPress={() => void Linking.openURL(`tel:${rider.contactNumber}`)} />
          ) : null}
        </Card>
      ) : null}

      <SectionHeader title="Order progress" />
      <Card>
        <OrderTimeline order={order} />
      </Card>

      <Card className="flex-row items-start gap-3">
        <Icon name="location" size={22} color={colors.primary} />
        <View className="flex-1 gap-1">
          <AppText variant="overline">Deliver to</AppText>
          <AppText>{order.deliveryAddress}</AppText>
        </View>
      </Card>

      <OrderSummaryCard order={order} />

      {order.paymentType === 'Credit' && order.paymentStatus === 'Unpaid' && order.orderStatus === 'Delivered' ? (
        <AppText variant="caption" className="text-center text-warning">
          You still owe {formatCurrency(order.totalAmount)} for this order
        </AppText>
      ) : null}

      <ReasonSheet
        isVisible={isCancelSheetVisible}
        title="Cancel this order?"
        subtitle="You can only cancel while the station has not accepted it yet."
        quickReasons={CANCEL_REASONS}
        confirmLabel="Yes, cancel my order"
        isReasonRequired={false}
        isSubmitting={orderActions.cancel.isPending}
        onClose={() => setIsCancelSheetVisible(false)}
        onConfirm={(reason) => void cancelOrder(reason)}
      />
    </Screen>
  );
}
