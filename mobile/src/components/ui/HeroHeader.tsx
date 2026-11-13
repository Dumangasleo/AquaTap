import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';

interface HeroHeaderProps {
  children: ReactNode;
  /** Tailwind classes for the content area (default padding `px-5 pb-8`). */
  className?: string;
}

/**
 * Blue "water" header used at the top of the main screens: a soft gradient with a wave at the bottom.
 * Put light-colored text inside it (e.g. `text-on-brand`).
 */
export function HeroHeader({ children, className }: HeroHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="overflow-hidden rounded-b-sheet bg-brand">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="water" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primaryDeep} />
            <Stop offset="0.55" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.accentBright} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="300" fill="url(#water)" />
        <Circle cx="350" cy="40" r="90" fill="#FFFFFF" opacity={0.07} />
        <Circle cx="40" cy="250" r="70" fill="#FFFFFF" opacity={0.06} />
        <Path d="M0 250 C 80 215, 150 285, 240 250 S 360 215, 400 245 L400 300 L0 300 Z" fill="#FFFFFF" opacity={0.1} />
        <Path d="M0 272 C 90 245, 170 300, 260 270 S 370 250, 400 272 L400 300 L0 300 Z" fill="#FFFFFF" opacity={0.12} />
      </Svg>
      <View className={cn('gap-4 px-5 pb-8', className)} style={{ paddingTop: insets.top + 16 }}>
        {children}
      </View>
    </View>
  );
}
