import { View } from 'react-native';
import { PaymentBadge } from '../../components/orders/OrderStatusBadge';
import { AppText, Card, Divider, KeyValueRow } from '../../components/ui';
import { colors } from '../../theme/tokens';
import type { CustomerOrder } from '../../types/api.types';
import { formatCurrency, formatDateTime, paymentModeLabels, paymentStatusLabels, paymentTypeLabels } from '../../utils/format';

/** Receipt-style breakdown of an order. */
export function OrderSummaryCard({ order }: { order: CustomerOrder }) {
  const isDelivered = order.orderStatus === 'Delivered';
  return (
    <Card className="gap-1">
      <View className="mb-1 flex-row items-center gap-2">
        <AppText variant="heading" className="flex-1">
          Order summary
        </AppText>
        <PaymentBadge paymentType={order.paymentType} paymentStatus={order.paymentStatus} />
      </View>
      <KeyValueRow label="Gallons ordered" value={`${order.gallonsOrdered} gal`} />
      <KeyValueRow label={isDelivered ? 'Empty gallons returned' : 'Empty gallons to return'} value={`${order.returnedGallons} gal`} />
      <KeyValueRow label="Price per gallon" value={formatCurrency(order.pricePerGallon)} />
      <Divider />
      <KeyValueRow label="Total" value={formatCurrency(order.totalAmount)} isEmphasized valueColor={colors.primary} />
      <Divider />
      <KeyValueRow label="Payment" value={paymentTypeLabels[order.paymentType]} />
      {order.paymentMode ? <KeyValueRow label="Paid with" value={paymentModeLabels[order.paymentMode]} /> : null}
      <KeyValueRow
        label="Paid or not yet"
        value={paymentStatusLabels[order.paymentStatus]}
        valueColor={order.paymentStatus === 'Paid' ? colors.success : colors.warning}
      />
      {order.paymentReference ? <KeyValueRow label="Reference no." value={order.paymentReference} /> : null}
      {order.paidAt ? <KeyValueRow label="Date paid" value={formatDateTime(order.paidAt)} /> : null}
      {order.customerNotes ? (
        <>
          <Divider />
          <AppText variant="overline">Note for the rider</AppText>
          <AppText>{order.customerNotes}</AppText>
        </>
      ) : null}
      {order.statusReason ? (
        <>
          <Divider />
          <AppText variant="overline">Reason</AppText>
          <AppText className="text-danger">{order.statusReason}</AppText>
        </>
      ) : null}
    </Card>
  );
}
