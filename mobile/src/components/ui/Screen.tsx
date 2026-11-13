import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';

interface ScreenProps {
  children: ReactNode;
  /** Header shown above the scrolling content. */
  header?: ReactNode;
  /** Bar that stays at the bottom (e.g. the main action button). */
  footer?: ReactNode;
  isScrollable?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  /** Tailwind classes for the content area (default: `p-4 gap-4 pb-8`). */
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}

const CONTENT_CLASSES = 'gap-4 p-4 pb-8';

/** Base layout for every screen: safe area, background, padding, pull-to-refresh and keyboard handling. */
export function Screen({
  children,
  header,
  footer,
  isScrollable = true,
  isRefreshing = false,
  onRefresh,
  edges = ['top'],
  contentClassName,
  contentStyle,
  scrollEnabled = true,
}: ScreenProps) {
  const content = isScrollable ? (
    <ScrollView
      contentContainerClassName={cn(CONTENT_CLASSES, contentClassName)}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1', CONTENT_CLASSES, contentClassName)} style={contentStyle}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        {content}
        {footer ? <View className="gap-2 border-t border-line bg-surface px-4 pb-4 pt-3">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
