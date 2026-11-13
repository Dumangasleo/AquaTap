import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import { useReducedMotion } from '../../hooks/use-reduced-motion';
import { toneClasses, toneColors, type Tone } from '../../theme/tokens';
import { registerConfirmHandler } from '../../utils/confirm';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

/** One "LABEL ... value" line shown inside the dialog, so the user can check the details before saying yes. */
export interface ConfirmDetail {
  label: string;
  value: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Summary of what will be saved, e.g. gallons, total, payment. */
  details?: ConfirmDetail[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for actions that remove, cancel or decline something. */
  tone?: Extract<Tone, 'primary' | 'danger' | 'success' | 'warning'>;
  icon?: IconName;
  /** Kept for older callers: same as `tone: 'danger'`. */
  isDestructive?: boolean;
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction>(() => Promise.resolve(false));

const defaultIcons: Record<NonNullable<ConfirmOptions['tone']>, IconName> = {
  primary: 'help-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'warning',
};

/**
 * Shows one confirmation dialog for the whole app. Wrap the app with it once (see app/_layout.tsx),
 * then call `const confirm = useConfirm()` or `confirmAction()` before saving a transaction.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveAnswer = useRef<((isConfirmed: boolean) => void) | null>(null);
  const isMotionReduced = useReducedMotion();
  const [cardScale] = useState(() => new Animated.Value(1));
  const isOpen = options !== null;

  // The card grows from 94% to full size while the background fades in, so the question "pops" into view.
  useEffect(() => {
    if (!isOpen || isMotionReduced) return;
    cardScale.setValue(0.94);
    Animated.timing(cardScale, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
  }, [isOpen, isMotionReduced, cardScale]);

  const confirm = useCallback<ConfirmFunction>((nextOptions) => {
    // A second question while one is open answers the first one with "no".
    resolveAnswer.current?.(false);
    setOptions(nextOptions);
    return new Promise<boolean>((resolve) => {
      resolveAnswer.current = resolve;
    });
  }, []);

  const answer = useCallback((isConfirmed: boolean) => {
    resolveAnswer.current?.(isConfirmed);
    resolveAnswer.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    registerConfirmHandler(confirm);
    return () => registerConfirmHandler(null);
  }, [confirm]);

  const contextValue = useMemo(() => confirm, [confirm]);
  const tone = options?.tone ?? (options?.isDestructive ? 'danger' : 'primary');

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={options !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => answer(false)}
      >
        <View className="flex-1 items-center justify-center bg-overlay px-6">
          <Pressable
            className="absolute inset-0"
            onPress={() => answer(false)}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
          {options ? (
            <Animated.View
              className="w-full max-w-[420px] gap-4 rounded-sheet bg-surface p-6"
              style={{ transform: [{ scale: cardScale }] }}
              accessibilityRole="alert"
              accessibilityViewIsModal
            >
              <View className={cn('h-16 w-16 items-center justify-center self-center rounded-full', toneClasses[tone].background)}>
                <Icon name={options.icon ?? defaultIcons[tone]} size={34} color={toneColors[tone].foreground} />
              </View>

              <View className="gap-1.5">
                <AppText variant="title" className="text-center" accessibilityRole="header">
                  {options.title}
                </AppText>
                {options.message ? (
                  <AppText className="text-center text-ink-muted">{options.message}</AppText>
                ) : null}
              </View>

              {options.details?.length ? (
                <View className="gap-2 rounded-field bg-canvas p-4">
                  {options.details.map((detail) => (
                    <View key={detail.label} className="flex-row items-start justify-between gap-4">
                      <AppText variant="overline" className="max-w-[45%] shrink pt-0.5">
                        {detail.label}
                      </AppText>
                      <AppText variant="bodyStrong" className="flex-1 text-right">
                        {detail.value}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              <View className="gap-2">
                <Button
                  label={options.confirmLabel ?? 'Yes, continue'}
                  variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'primary'}
                  size="lg"
                  fullWidth
                  onPress={() => answer(true)}
                />
                <Button
                  label={options.cancelLabel ?? 'No, go back'}
                  variant="ghost"
                  fullWidth
                  onPress={() => answer(false)}
                />
              </View>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (await confirm({ title: 'Place this order?' })) { ... }` */
export function useConfirm(): ConfirmFunction {
  return useContext(ConfirmContext);
}
