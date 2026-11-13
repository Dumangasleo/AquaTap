import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const variantClasses: Record<ButtonVariant, { container: string; text: string; iconColor: string }> = {
  primary: { container: 'bg-brand active:bg-brand-pressed', text: 'text-on-brand', iconColor: colors.textOnPrimary },
  secondary: { container: 'bg-brand-soft active:bg-brand-line', text: 'text-brand', iconColor: colors.primary },
  outline: {
    container: 'bg-surface border-[1.5px] border-line-strong active:bg-surface-muted',
    text: 'text-ink',
    iconColor: colors.text,
  },
  ghost: { container: 'bg-transparent active:bg-surface-muted', text: 'text-brand', iconColor: colors.primary },
  danger: { container: 'bg-danger active:bg-danger-pressed', text: 'text-on-brand', iconColor: colors.textOnPrimary },
  success: { container: 'bg-success active:bg-success-strong', text: 'text-on-brand', iconColor: colors.textOnPrimary },
};

const sizeClasses: Record<ButtonSize, { container: string; text: string; iconSize: number }> = {
  sm: { container: 'min-h-[40px] px-3 rounded-[12px]', text: 'text-[14px] leading-[20px]', iconSize: 18 },
  md: { container: 'min-h-[50px] px-5 rounded-field', text: 'text-[15px] leading-[20px]', iconSize: 20 },
  lg: { container: 'min-h-[58px] px-6 rounded-field', text: 'text-[16px] leading-[22px]', iconSize: 22 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  className,
  style,
  accessibilityHint,
}: ButtonProps) {
  const palette = variantClasses[variant];
  const dimensions = sizeClasses[size];
  const isInactive = isDisabled || isLoading;
  const iconElement = icon ? <Icon name={icon} size={dimensions.iconSize} color={palette.iconColor} /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      disabled={isInactive}
      onPress={onPress}
      className={cn(
        'items-center justify-center',
        dimensions.container,
        palette.container,
        fullWidth && 'self-stretch',
        isDisabled && 'opacity-45',
        className,
      )}
      style={style}
    >
      {isLoading ? (
        <ActivityIndicator color={palette.iconColor} />
      ) : (
        <View className="max-w-full flex-row items-center gap-2">
          {iconPosition === 'left' && iconElement}
          {/* One line that shrinks slightly before it would cut the label ("Yes, place or…"). */}
          <AppText
            className={cn('shrink font-heading', dimensions.text, palette.text)}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            maxFontSizeMultiplier={1.3}
          >
            {label}
          </AppText>
          {iconPosition === 'right' && iconElement}
        </View>
      )}
    </PressableScale>
  );
}
