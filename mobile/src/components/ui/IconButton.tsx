import { colors, MIN_TOUCH_SIZE } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  className?: string;
}

/** Round button with only an icon (back, close, next day...). */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.text,
  backgroundColor,
  size = MIN_TOUCH_SIZE,
  className,
}: IconButtonProps) {
  return (
    <PressableScale
      pressedScale={0.92}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      className={cn(
        'items-center justify-center rounded-full border border-line bg-surface active:bg-surface-muted',
        className,
      )}
      style={[{ width: size, height: size }, backgroundColor ? { backgroundColor } : null]}
    >
      <Icon name={icon} size={22} color={color} />
    </PressableScale>
  );
}
