import { View } from 'react-native';
import { toneClasses, toneColors, type Tone } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  /** Small solid dot before the label (used for live statuses). */
  showDot?: boolean;
}

/** Small colored pill for a status, shown in UPPERCASE (PENDING, PAID, UTANG...). */
export function Badge({ label, tone = 'neutral', icon, showDot }: BadgeProps) {
  const classes = toneClasses[tone];
  const foreground = toneColors[tone].foreground;

  return (
    <View className={cn('flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1', classes.background)}>
      {showDot ? <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: foreground }} /> : null}
      {icon ? <Icon name={icon} size={13} color={foreground} /> : null}
      <AppText className={cn('font-heading text-[11px] uppercase leading-[14px] tracking-[0.5px]', classes.text)} numberOfLines={1} maxFontSizeMultiplier={1.25}>
        {label}
      </AppText>
    </View>
  );
}
