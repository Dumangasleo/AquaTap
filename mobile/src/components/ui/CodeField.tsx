import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface CodeFieldProps {
  /** Shown in UPPERCASE above the boxes. */
  label: string;
  value: string;
  onChangeText: (code: string) => void;
  length?: number;
  errorText?: string | null;
  autoFocus?: boolean;
  /** Called when all the boxes are filled. */
  onComplete?: (code: string) => void;
}

/** Row of boxes for typing a one-time code (the 6 numbers from the authenticator app). */
export function CodeField({ label, value, onChangeText, length = 6, errorText, autoFocus, onComplete }: CodeFieldProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <View className="gap-2">
      <AppText variant="overline">{label}</AppText>
      <Pressable
        className="flex-row justify-between gap-2"
        onPress={() => inputRef.current?.focus()}
        accessible={false}
      >
        {Array.from({ length }, (_, index) => {
          const isActive = isFocused && index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              className={cn(
                'h-[60px] flex-1 items-center justify-center rounded-field border-[1.5px] border-line-strong bg-surface',
                isActive && 'border-brand bg-brand-soft/40',
                errorText && 'border-danger',
              )}
            >
              <AppText className="font-display text-[26px] leading-[32px] text-ink">{value[index] ?? ''}</AppText>
            </View>
          );
        })}
        {/* One real input sits on top of the boxes, invisible, so paste and the number keyboard work normally. */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={length}
          autoFocus={autoFocus}
          caretHidden
          accessibilityLabel={label}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 text-transparent opacity-[0.02] outline-none"
        />
      </Pressable>
      {errorText ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="alert-circle" size={16} color={colors.danger} />
          <AppText variant="caption" className="flex-1 text-danger">
            {errorText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
