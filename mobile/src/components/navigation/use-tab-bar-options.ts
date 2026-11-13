import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { colors, fonts } from '../../theme/tokens';

type TabScreenOptions = NonNullable<ComponentProps<typeof Tabs>['screenOptions']>;

/** Look of the bottom tab bar, shared by the customer and the staff tabs. */
export function useTabBarOptions(): TabScreenOptions {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const isMotionReduced = useReducedMotion();

  return {
    headerShown: false,
    // Switching tabs cross-fades instead of jumping (off when the phone asks for less motion).
    animation: isMotionReduced ? 'none' : 'fade',
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSubtle,
    tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11.5, marginTop: 2 },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: 60 + bottomInset,
      paddingTop: 8,
      paddingBottom: bottomInset,
    },
    sceneStyle: { backgroundColor: colors.background },
  };
}
