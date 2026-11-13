import { View } from 'react-native';
import { colors } from '../../theme/tokens';
import { formatDateOnlyLabel, shiftDateOnly, todayDateOnly } from '../../utils/format';
import { AppText } from './AppText';
import { Button } from './Button';
import { IconButton } from './IconButton';

interface DateNavigatorProps {
  date: string;
  onChange: (date: string) => void;
  /** Allow dates after today. */
  allowFuture?: boolean;
}

/** "‹  Today  ›" day picker — simpler than a calendar for daily records. */
export function DateNavigator({ date, onChange, allowFuture = false }: DateNavigatorProps) {
  const isToday = date === todayDateOnly();
  const canGoForward = allowFuture || date < todayDateOnly();

  return (
    <View className="flex-row items-center gap-2 rounded-card border border-line bg-surface p-2">
      <IconButton icon="chevron-back" accessibilityLabel="Previous day" onPress={() => onChange(shiftDateOnly(date, -1))} />
      <View className="flex-1 items-center">
        <AppText variant="heading" className="text-center">
          {formatDateOnlyLabel(date)}
        </AppText>
        {!isToday ? (
          <Button label="Back to today" variant="ghost" size="sm" onPress={() => onChange(todayDateOnly())} />
        ) : (
          <AppText variant="caption" className="text-center text-ink-subtle">
            {date}
          </AppText>
        )}
      </View>
      <IconButton
        icon="chevron-forward"
        accessibilityLabel="Next day"
        onPress={() => canGoForward && onChange(shiftDateOnly(date, 1))}
        color={canGoForward ? colors.text : colors.borderStrong}
      />
    </View>
  );
}
