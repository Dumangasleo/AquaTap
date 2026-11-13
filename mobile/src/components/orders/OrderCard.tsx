import { View } from 'react-native';
import { colors } from '../../theme/tokens';
import type { CustomerOrder } from '../../types/api.types';
import { cn } from '../../utils/cn';
import { formatCurrency, formatRelativeTime, paymentModeLabels } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { OrderStatusBadge, PaymentBadge } from './OrderStatusBadge';

interface OrderCardProps {
  order: CustomerOrder;
  onPress: () => void;
  /** Staff view shows the customer's name and address. */
  showCustomer?: boolean;
}

export function OrderCard({ order, onPress, showCustomer = false }: OrderCardProps) {
  const isPending = order.orderStatus === 'Pending';
  const title = showCustomer ? (order.customer?.fullName ?? 'Customer') : `${order.gallonsOrdered} gallon${order.gallonsOrdered > 1 ? 's' : ''} of water`;

  return (
    <Card
      onPress={onPress}
      highlightColor={isPending ? colors.danger : undefined}
      accessibilityLabel={`Order ${order.orderNumber}, ${title}, ${order.orderStatus}`}
      className={cn('gap-3', isPending && 'bg-[#FFFBFB]')}
    >
      <View className="flex-row items-center justify-between">
        <OrderStatusBadge status={order.orderStatus} />
        <AppText variant="caption" className="text-ink-subtle">
          {formatRelativeTime(order.orderedAt)}
        </AppText>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <AppText variant="heading" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" className="text-ink-muted">
            #{order.orderNumber}
          </AppText>
        </View>
        <AppText className="font-display text-[20px] leading-[26px] text-brand">
          {formatCurrency(order.totalAmount)}
        </AppText>
      </View>

      {showCustomer ? (
        <View className="flex-row items-start gap-1">
          <Icon name="location-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption" className="flex-1 text-ink-muted" numberOfLines={2}>
            {order.deliveryAddress}
          </AppText>
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-1.5">
        {showCustomer ? <Badge label={`${order.gallonsOrdered} gal`} tone="primary" icon="water-outline" /> : null}
        <Badge label={`${order.returnedGallons} empty to return`} tone="neutral" icon="repeat-outline" />
        <PaymentBadge paymentType={order.paymentType} paymentStatus={order.paymentStatus} />
        {order.paymentMode && order.paymentMode !== 'Cash' ? <Badge label={paymentModeLabels[order.paymentMode]} tone="accent" /> : null}
        {order.isAssignedToMe && order.orderStatus === 'Accepted' ? <Badge label="Assigned to you" tone="primary" icon="person" /> : null}
      </View>
    </Card>
  );
}
