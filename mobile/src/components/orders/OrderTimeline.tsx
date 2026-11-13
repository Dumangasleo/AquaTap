import { View } from 'react-native';
import { colors } from '../../theme/tokens';
import type { CustomerOrder } from '../../types/api.types';
import { formatDateTime } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon, type IconName } from '../ui/Icon';

interface TimelineStep {
  label: string;
  time: string | null;
  icon: IconName;
  isDone: boolean;
  isProblem?: boolean;
}

function buildSteps(order: CustomerOrder): TimelineStep[] {
  const steps: TimelineStep[] = [{ label: 'Order placed', time: order.orderedAt, icon: 'receipt-outline', isDone: true }];

  if (order.orderStatus === 'Declined' || order.orderStatus === 'Cancelled') {
    steps.push({
      label: order.orderStatus === 'Declined' ? 'Declined by the station' : 'Cancelled by you',
      time: order.closedAt,
      icon: 'close-circle-outline',
      isDone: true,
      isProblem: true,
    });
    return steps;
  }

  steps.push({ label: 'Accepted — on the way', time: order.acceptedAt, icon: 'bicycle-outline', isDone: order.acceptedAt !== null });

  if (order.orderStatus === 'Failed') {
    steps.push({ label: 'Not delivered', time: order.closedAt, icon: 'alert-circle-outline', isDone: true, isProblem: true });
  } else {
    steps.push({ label: 'Delivered', time: order.deliveredAt, icon: 'checkmark-done-outline', isDone: order.deliveredAt !== null });
  }
  return steps;
}

export function OrderTimeline({ order }: { order: CustomerOrder }) {
  const steps = buildSteps(order);
  return (
    <View>
      {steps.map((step, index) => {
        const color = step.isProblem ? colors.danger : step.isDone ? colors.success : colors.borderStrong;
        return (
          <View key={step.label} className="flex-row gap-3">
            <View className="w-8 items-center">
              <View
                className="h-8 w-8 items-center justify-center rounded-full border-2"
                style={{ borderColor: color, backgroundColor: step.isDone ? color : colors.surface }}
              >
                <Icon name={step.icon} size={16} color={step.isDone ? colors.textOnPrimary : colors.textSubtle} />
              </View>
              {index < steps.length - 1 ? (
                <View className="min-h-[18px] w-0.5 flex-1" style={{ backgroundColor: steps[index + 1].isDone ? colors.success : colors.border }} />
              ) : null}
            </View>
            <View className="flex-1 gap-0.5 pb-4 pt-0.5">
              <AppText variant="bodyStrong" className={step.isDone ? 'text-ink' : 'text-ink-subtle'}>
                {step.label}
              </AppText>
              <AppText variant="caption" className="text-ink-subtle">
                {step.time ? formatDateTime(step.time) : 'Waiting…'}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
