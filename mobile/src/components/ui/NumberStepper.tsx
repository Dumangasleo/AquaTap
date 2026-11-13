import { Pressable, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface NumberStepperProps {
  /** Shown in UPPERCASE above the counter. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  helperText?: string;
}

const STEP_BUTTON_CLASSES = 'h-14 w-14 items-center justify-center rounded-[18px] bg-brand active:bg-brand-pressed';

/** Big − / + counter for gallons (no typing needed). */
export function NumberStepper({ label, value, onChange, min = 0, max = 100, unit = 'gallons', helperText }: NumberStepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View className="gap-2">
      <AppText variant="overline">{label}</AppText>
      <View className="flex-row items-center rounded-card border-[1.5px] border-line bg-surface p-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={!canDecrease}
          onPress={() => onChange(value - 1)}
          className={cn(STEP_BUTTON_CLASSES, !canDecrease && 'opacity-30')}
        >
          <Icon name="remove" size={28} color={colors.textOnPrimary} />
        </Pressable>

        <View className="flex-1 items-center" accessible accessibilityLabel={`${value} ${unit}`}>
          <AppText className="font-display text-[34px] leading-[40px] text-ink">{value}</AppText>
          <AppText variant="overline">{unit}</AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={!canIncrease}
          onPress={() => onChange(value + 1)}
          className={cn(STEP_BUTTON_CLASSES, !canIncrease && 'opacity-30')}
        >
          <Icon name="add" size={28} color={colors.textOnPrimary} />
        </Pressable>
      </View>
      {helperText ? (
        <AppText variant="caption" className="text-ink-subtle">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}
