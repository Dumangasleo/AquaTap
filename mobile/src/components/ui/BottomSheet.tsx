import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface BottomSheetProps {
  isVisible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Panel that slides up from the bottom for short forms (reason, delivery, payment...).
 * The dark background fades in while only the white panel slides up (with `animationType="slide"`
 * the dark background slid up together with the panel, which looked heavy).
 */
export function BottomSheet({ isVisible, title, subtitle, onClose, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isMotionReduced = useReducedMotion();
  const [translateY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!isVisible) return;
    if (isMotionReduced) {
      translateY.setValue(0);
      return;
    }
    translateY.setValue(windowHeight * 0.5);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isVisible, isMotionReduced, translateY, windowHeight]);

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable className="absolute inset-0 bg-overlay" onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <Animated.View
          className="mt-auto max-h-[90%] rounded-t-sheet bg-surface pt-2.5"
          style={{ paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }}
        >
          <View className="mb-2 h-[5px] w-11 self-center rounded-full bg-line-strong" />
          <View className="flex-row items-center gap-3 px-5 pb-2">
            <View className="flex-1 gap-0.5">
              <AppText variant="title" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" className="text-ink-muted">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} size={40} />
          </View>
          <ScrollView contentContainerClassName="gap-4 px-5 py-3" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View className="gap-2 px-5 pt-2">{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
