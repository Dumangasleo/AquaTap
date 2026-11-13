import { Pressable, ScrollView } from 'react-native';
import { AppText } from '../../components/ui';
import { cn } from '../../utils/cn';

export interface FilterChipOption<TValue extends string | number> {
  value: TValue;
  label: string;
}

interface FilterChipsProps<TValue extends string | number> {
  options: FilterChipOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  accessibilityLabel: string;
}

/** Horizontal row of pill-shaped filters (date presets, employee filter, quick reasons). */
export function FilterChips<TValue extends string | number>({ options, value, onChange, accessibilityLabel }: FilterChipsProps<TValue>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 py-0.5"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            className={cn(
              'min-h-[44px] items-center justify-center rounded-full border-[1.5px] px-4',
              isSelected ? 'border-brand bg-brand' : 'border-line-strong bg-surface',
            )}
          >
            <AppText variant="label" className={cn('font-heading', isSelected ? 'text-on-brand' : 'text-ink')} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
