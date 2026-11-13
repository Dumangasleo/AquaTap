import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, toneClasses, type Tone } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });

const toastAppearance: Record<ToastType, { icon: IconName; color: string; tone: Tone }> = {
  success: { icon: 'checkmark-circle', color: colors.success, tone: 'success' },
  error: { icon: 'alert-circle', color: colors.danger, tone: 'danger' },
  info: { icon: 'information-circle', color: colors.primary, tone: 'primary' },
};

/** Short message at the top of the screen that goes away by itself ("Order accepted"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, type });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, type === 'error' ? 4500 : 2800);
    },
    [opacity],
  );

  const contextValue = useMemo(() => ({ showToast }), [showToast]);
  const appearance = toast ? toastAppearance[toast.type] : null;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && appearance ? (
        <Animated.View
          pointerEvents="none"
          className="absolute left-4 right-4 z-50 items-center"
          style={{
            top: insets.top + 8,
            opacity,
            // Drops in from 12 px above while it fades in, and rises back while it fades out.
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          }}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <View className="w-full max-w-[520px] flex-row items-center gap-3 rounded-[20px] border border-line bg-surface px-4 py-3 shadow-lg shadow-brand-deep/20">
            <View className={cn('h-9 w-9 items-center justify-center rounded-full', toneClasses[appearance.tone].background)}>
              <Icon name={appearance.icon} size={22} color={appearance.color} />
            </View>
            <AppText variant="bodyStrong" className="flex-1">
              {toast.message}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
