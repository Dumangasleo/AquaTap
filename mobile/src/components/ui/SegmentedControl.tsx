import { ScrollView, View } from 'react-native';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface SegmentOption<TValue extends string> {
  value: TValue;
  label: string;
  /** Optional number shown as a pill (e.g. orders waiting). */
  count?: number;
  countTone?: 'danger' | 'primary';
}

interface SegmentedControlProps<TValue extends string> {
  options: SegmentOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  /** Chips scroll sideways instead of sharing the width equally. */
  isScrollable?: boolean;
}

/** Row of choices where one is selected (tabs inside a screen, filters). */
export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  isScrollable = false,
}: SegmentedControlProps<TValue>) {
  const items = options.map((option) => {
    const isSelected = option.value === value;
    return (
      <PressableScale
        key={option.value}
        pressedScale={0.96}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={option.count ? `${option.label}, ${option.count}` : option.label}
        onPress={() => onChange(option.value)}
        className={cn(
          'min-h-[44px] flex-row items-center justify-center gap-1.5 px-3.5',
          isScrollable
            ? cn('rounded-full border-[1.5px]', isSelected ? 'border-brand bg-brand' : 'border-line-strong bg-surface')
            : cn('flex-1 rounded-[12px]', isSelected && 'bg-surface shadow-sm shadow-brand-deep/10'),
        )}
      >
        <AppText
          variant="label"
          className={cn(
            'font-heading',
            isScrollable ? (isSelected ? 'text-on-brand' : 'text-ink-muted') : isSelected ? 'text-brand' : 'text-ink-muted',
          )}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {option.label}
        </AppText>
        {option.count ? (
          <View
            className={cn(
              'h-5 min-w-5 items-center justify-center rounded-full px-1.5',
              option.countTone === 'danger' ? 'bg-danger' : isScrollable && isSelected ? 'bg-surface' : 'bg-brand',
            )}
          >
            <AppText
              variant="tiny"
              className={cn(option.countTone !== 'danger' && isScrollable && isSelected ? 'text-brand' : 'text-on-brand')}
            >
              {option.count > 99 ? '99+' : option.count}
            </AppText>
          </View>
        ) : null}
      </PressableScale>
    );
  });

  if (isScrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-0.5">
        {items}
      </ScrollView>
    );
  }
  return <View className="flex-row gap-1 rounded-field bg-surface-muted p-1">{items}</View>;
}
