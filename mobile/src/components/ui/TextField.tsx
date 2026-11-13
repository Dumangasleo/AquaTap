import { useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface TextFieldProps extends TextInputProps {
  /** Shown in UPPERCASE above the field so it is easy to find. */
  label: string;
  helperText?: string;
  errorText?: string | null;
  isRequired?: boolean;
  leftIcon?: IconName;
  prefix?: string;
  /** Extra control at the right side of the field (e.g. show / hide password). */
  rightAccessory?: ReactNode;
}

/** Labelled input: the label always stays visible above the field. */
export function TextField({
  label,
  helperText,
  errorText,
  isRequired,
  leftIcon,
  prefix,
  rightAccessory,
  multiline,
  className,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-2">
      <AppText variant="overline">
        {label}
        {isRequired ? <AppText variant="overline" className="text-danger"> *</AppText> : null}
      </AppText>

      <View
        className={cn(
          'min-h-[56px] flex-row items-center gap-2.5 rounded-field border-[1.5px] border-line-strong bg-surface px-4',
          multiline && 'items-start py-2.5',
          isFocused && 'border-brand bg-brand-soft/40',
          errorText && 'border-danger',
        )}
      >
        {leftIcon ? <Icon name={leftIcon} size={20} color={isFocused ? colors.primary : colors.textSubtle} /> : null}
        {prefix ? <AppText className="font-body-strong text-ink-muted">{prefix}</AppText> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            'flex-1 py-2 font-body-medium text-[16px] leading-[22px] text-ink outline-none',
            multiline && 'min-h-[96px]',
            className,
          )}
          style={style}
          {...inputProps}
        />
        {rightAccessory}
      </View>

      {errorText ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="alert-circle" size={16} color={colors.danger} />
          <AppText variant="caption" className="flex-1 text-danger">
            {errorText}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" className="text-ink-subtle">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

/** Password input with a "show / hide" button. */
export function PasswordField(props: Omit<TextFieldProps, 'secureTextEntry' | 'rightAccessory'>) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      leftIcon="lock-closed-outline"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!isVisible}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          hitSlop={10}
          onPress={() => setIsVisible((wasVisible) => !wasVisible)}
        >
          <Icon name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSubtle} />
        </Pressable>
      }
    />
  );
}
