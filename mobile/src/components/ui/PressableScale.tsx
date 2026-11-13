import { useState, type ComponentProps } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '../../hooks/use-reduced-motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  /** Plain style only (Animated cannot read a style function). Use `className` for everything else. */
  style?: StyleProp<ViewStyle>;
  /** How small the element gets while pressed (1 = no shrink). Big cards use a smaller change than buttons. */
  pressedScale?: number;
};

/**
 * Pressable that shrinks a little while the finger is down and springs back when released,
 * so every tap gets instant, physical feedback. Takes the same props and `className` as `Pressable`
 * (the `active:` classes still work). With "Reduce motion" on, it only uses the `active:` colors.
 */
export function PressableScale({ pressedScale = 0.97, onPressIn, onPressOut, style, disabled, ...pressableProps }: PressableScaleProps) {
  const isMotionReduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (toValue: number, isPressing: boolean) => {
    if (isMotionReduced) return;
    // Press in fast (feels responsive), release with a soft spring (feels smooth).
    const animation = isPressing
      ? Animated.timing(scale, { toValue, duration: 90, useNativeDriver: true })
      : Animated.spring(scale, { toValue, speed: 28, bounciness: 6, useNativeDriver: true });
    animation.start();
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) animateTo(pressedScale, true);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1, false);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...pressableProps}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
