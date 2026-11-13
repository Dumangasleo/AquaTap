import { View } from 'react-native';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface OptionCardItem<TValue extends string> {
  value: TValue;
  title: string;
  description?: string;
  icon?: IconName;
}

interface OptionCardsProps<TValue extends string> {
  /** Shown in UPPERCASE above the choices. */
  label?: string;
  options: OptionCardItem<TValue>[];
  value: TValue | null;
  onChange: (value: TValue) => void;
  columns?: 1 | 2 | 3;
}

const columnClasses: Record<1 | 2 | 3, string> = {
  1: 'basis-full',
  2: 'basis-[47%]',
  3: 'basis-[30%]',
};

/**
 * Big, easy-to-tap choices where only one can be picked (how to pay, payment method, category).
 * In 3 columns each card is only ~100 px wide on a 360 px phone, so the title stays on ONE line and
 * shrinks a little if needed instead of breaking a word in the middle.
 */
export function OptionCards<TValue extends string>({ label, options, value, onChange, columns = 2 }: OptionCardsProps<TValue>) {
  const isCompact = columns === 3;

  return (
    <View className="gap-2">
      {label ? <AppText variant="overline">{label}</AppText> : null}
      <View className="flex-row flex-wrap gap-2.5">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <PressableScale
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.title}
              onPress={() => onChange(option.value)}
              className={cn(
                'min-h-[68px] grow gap-1 rounded-[20px] border-[1.5px]',
                isCompact ? 'p-3' : 'p-3.5',
                columnClasses[columns],
                isSelected ? 'border-brand bg-brand-soft' : 'border-line bg-surface active:bg-surface-muted',
              )}
            >
              <View className="flex-row items-center justify-between">
                {option.icon ? <Icon name={option.icon} size={24} color={isSelected ? colors.primary : colors.textMuted} /> : null}
                <View
                  className={cn(
                    'ml-auto h-[22px] w-[22px] items-center justify-center rounded-full border-2',
                    isSelected ? 'border-brand bg-brand' : 'border-line-strong',
                  )}
                >
                  {isSelected ? <Icon name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
                </View>
              </View>
              <AppText
                variant="bodyStrong"
                className={cn('font-heading', isSelected ? 'text-brand' : 'text-ink')}
                numberOfLines={isCompact ? 1 : undefined}
                adjustsFontSizeToFit={isCompact}
                minimumFontScale={0.8}
                maxFontSizeMultiplier={isCompact ? 1.3 : undefined}
              >
                {option.title}
              </AppText>
              {option.description ? (
                <AppText variant="caption" className="text-ink-muted">
                  {option.description}
                </AppText>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
