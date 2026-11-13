import type { OrderStatus, PaymentStatus, PaymentType } from '../../types/api.types';
import { orderStatusLabels, orderStatusTones } from '../../utils/format';
import { Badge } from '../ui/Badge';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge label={orderStatusLabels[status]} tone={orderStatusTones[status]} showDot={status === 'Pending' || status === 'Accepted'} />;
}

export function PaymentBadge({ paymentType, paymentStatus }: { paymentType: PaymentType; paymentStatus: PaymentStatus }) {
  if (paymentStatus === 'Paid') return <Badge label="Paid" tone="success" icon="checkmark-circle" />;
  if (paymentType === 'Credit') return <Badge label="Utang" tone="warning" icon="time-outline" />;
  return <Badge label="Pay on delivery" tone="info" icon="cash-outline" />;
}
