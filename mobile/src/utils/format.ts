import type {
  ExpenseCategory,
  OrderStatus,
  PaymentMode,
  PaymentStatus,
  PaymentType,
} from '../types/api.types';
import type { Tone } from '../theme/tokens';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return pesoFormatter.format(amount);
}

export function formatGallons(count: number): string {
  return `${count} gal`;
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  return `${formatDate(isoDate)}, ${formatTime(isoDate)}`;
}

/** "Just now", "5 min ago", "2 hr ago", or the date. */
export function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const minutesAgo = Math.round((Date.now() - new Date(isoDate).getTime()) / 60_000);
  if (minutesAgo < 1) return 'Just now';
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hr ago`;
  return formatDate(isoDate);
}

/** YYYY-MM-DD in the phone's local time. */
export function toDateOnlyString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateOnly(): string {
  return toDateOnlyString(new Date());
}

export function shiftDateOnly(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return toDateOnlyString(new Date(year, month - 1, day + days));
}

export function formatDateOnlyLabel(dateOnly: string): string {
  if (dateOnly === todayDateOnly()) return 'Today';
  if (dateOnly === shiftDateOnly(todayDateOnly(), -1)) return 'Yesterday';
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

// ----- Human-friendly labels -----

export const orderStatusLabels: Record<OrderStatus, string> = {
  Pending: 'Waiting',
  Accepted: 'On the way',
  Delivered: 'Delivered',
  Declined: 'Declined',
  Cancelled: 'Cancelled',
  Failed: 'Not delivered',
};

export const orderStatusTones: Record<OrderStatus, Tone> = {
  Pending: 'danger',
  Accepted: 'primary',
  Delivered: 'success',
  Declined: 'neutral',
  Cancelled: 'neutral',
  Failed: 'warning',
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  Cash: 'Pay now',
  Credit: 'Utang (pay later)',
};

export const paymentModeLabels: Record<PaymentMode, string> = {
  Cash: 'Cash',
  GCash: 'GCash',
  BankTransfer: 'Bank transfer',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  Unpaid: 'Not yet paid',
  Paid: 'Paid',
};

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  Food: 'Food',
  Fuel: 'Gasoline',
  VehicleRepair: 'Repair / flat tire',
  Maintenance: 'Maintenance',
  Supplies: 'Supplies',
  Other: 'Other',
};

export const expenseCategoryIcons: Record<ExpenseCategory, string> = {
  Food: 'fast-food-outline',
  Fuel: 'speedometer-outline',
  VehicleRepair: 'construct-outline',
  Maintenance: 'build-outline',
  Supplies: 'cube-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};
