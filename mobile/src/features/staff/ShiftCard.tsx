import { View } from 'react-native';
import { AppText, Badge, Button, Card, Icon } from '../../components/ui';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { formatTime } from '../../utils/format';
import { formatDurationSince, useActiveShift } from './use-staff-queries';

/** Time in / Time out card for the signed-in employee. */
export function ShiftCard() {
  const { activeShift, isLoading, timeIn, timeOut, isTimingIn, isTimingOut } = useActiveShift();
  if (isLoading) return null;

  return (
    <Card className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className={cn('h-12 w-12 items-center justify-center rounded-field', activeShift ? 'bg-success-soft' : 'bg-neutral-soft')}>
          <Icon name={activeShift ? 'time' : 'time-outline'} size={24} color={activeShift ? colors.success : colors.textMuted} />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText variant="heading">{activeShift ? 'You are on duty' : 'You are off duty'}</AppText>
          <AppText variant="caption" className="text-ink-muted">
            {activeShift
              ? `Time in at ${formatTime(activeShift.timeIn)} · ${formatDurationSince(activeShift.timeIn)}`
              : 'Time in first so your deliveries today are saved in your shift.'}
          </AppText>
        </View>
        {activeShift ? <Badge label="On duty" tone="success" showDot /> : null}
      </View>
      {activeShift ? (
        <Button label="Time out" icon="log-out-outline" variant="outline" size="lg" fullWidth isLoading={isTimingOut} onPress={() => void timeOut()} />
      ) : (
        <Button label="Time in" icon="log-in-outline" variant="success" size="lg" fullWidth isLoading={isTimingIn} onPress={() => void timeIn()} />
      )}
    </Card>
  );
}
