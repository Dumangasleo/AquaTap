import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: ReactNode;
}

/** Title bar at the top of a screen, with an optional back button. */
export function ScreenHeader({ title, subtitle, showBackButton = false, onBackPress, rightAction }: ScreenHeaderProps) {
  const router = useRouter();
  const handleBack = () => {
    if (onBackPress) return onBackPress();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View className="flex-row items-center gap-3 bg-canvas px-4 pb-3 pt-2">
      {showBackButton ? <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={handleBack} /> : null}
      <View className="flex-1 gap-0.5">
        <AppText variant="title" numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" className="text-ink-muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightAction}
    </View>
  );
}
