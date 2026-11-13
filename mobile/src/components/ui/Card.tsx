import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cn } from '../../utils/cn';
import { PressableScale } from './PressableScale';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Border color that highlights the card (e.g. red for orders waiting for an answer). */
  highlightColor?: string;
}

const CARD_CLASSES = 'bg-surface rounded-card p-4 border border-line shadow-sm shadow-brand-deep/5';

/** White rounded box that groups related information. */
export function Card({ children, onPress, className, style, accessibilityLabel, highlightColor }: CardProps) {
  const highlightStyle = highlightColor ? { borderColor: highlightColor, borderWidth: 1.5 } : null;

  if (!onPress) {
    return (
      <View className={cn(CARD_CLASSES, className)} style={[highlightStyle, style]}>
        {children}
      </View>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      pressedScale={0.985}
      className={cn(CARD_CLASSES, 'active:bg-surface-muted', className)}
      style={[highlightStyle, style]}
    >
      {children}
    </PressableScale>
  );
}
