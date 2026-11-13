import { View, type StyleProp, type ViewStyle } from 'react-native';
import { toneClasses, toneColors, type Tone } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface StatCardProps {
  /** Shown in UPPERCASE above the number. */
  label: string;
  value: string;
  icon?: IconName;
  tone?: Tone;
  caption?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small box with one important number (sales today, gallons with the customer...).
 * The icon sits ABOVE the label so the label gets the full card width: beside the icon it only had
 * ~80 px on a 360 px phone, and long uppercase words were split in the middle.
 */
export function StatCard({ label, value, icon, tone = 'primary', caption, className, style }: StatCardProps) {
  return (
    <View
      className={cn('min-w-[140px] grow basis-[45%] gap-2 rounded-card border border-line bg-surface p-4', className)}
      style={style}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      {icon ? (
        <View className={cn('h-9 w-9 items-center justify-center rounded-[12px]', toneClasses[tone].background)}>
          <Icon name={icon} size={19} color={toneColors[tone].foreground} />
        </View>
      ) : null}
      <AppText variant="overline" numberOfLines={2}>
        {label}
      </AppText>
      <AppText className="font-display text-[24px] leading-[30px] text-ink" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {caption ? (
        <AppText variant="caption" className="text-ink-subtle" numberOfLines={2}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}
