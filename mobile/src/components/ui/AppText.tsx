import { Text, type TextProps, type TextStyle } from 'react-native';
import { cn } from '../../utils/cn';

/**
 * Text styles of the app.
 * - display / title / heading: screen and section titles (rounded Varela Round)
 * - body / bodyStrong: normal reading text
 * - label: names of things inside rows and buttons
 * - overline: SMALL UPPERCASE LABEL above a field, a section or a number (easy to scan)
 * - caption / tiny: helper text
 */
export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'overline' | 'caption' | 'tiny';

const variantClasses: Record<TextVariant, string> = {
  display: 'font-display text-[28px] leading-[34px]',
  title: 'font-display text-[22px] leading-[28px]',
  heading: 'font-display text-[18px] leading-[24px]',
  body: 'font-body text-[16px] leading-[24px]',
  bodyStrong: 'font-body-strong text-[16px] leading-[24px]',
  label: 'font-body-strong text-[14px] leading-[20px]',
  overline: 'font-heading text-[12px] leading-[16px] uppercase tracking-[0.7px] text-ink-muted',
  caption: 'font-body-medium text-[13px] leading-[18px]',
  tiny: 'font-body-strong text-[12px] leading-[16px]',
};

/**
 * How much the phone's "Font size" setting may enlarge each variant.
 * Small labels sit in tight boxes (chips, table headers, stat cards): if they grow without limit, one word
 * no longer fits its box and React Native splits it in the middle ("PAY / MENT"). Reading text (`body`)
 * keeps the full system size for accessibility.
 */
const maxFontScale: Partial<Record<TextVariant, number>> = {
  display: 1.3,
  title: 1.3,
  heading: 1.4,
  label: 1.3,
  overline: 1.25,
  caption: 1.4,
  tiny: 1.25,
};

const weightClasses: Record<string, string> = {
  '400': 'font-body',
  '500': 'font-body-medium',
  '600': 'font-body-strong',
  '700': 'font-heading',
  '800': 'font-display',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** Tailwind classes, e.g. `text-ink-muted text-center`. */
  className?: string;
  /** Color value for cases where a class cannot be used (dynamic tone colors). */
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: '400' | '500' | '600' | '700' | '800';
}

/** The only text component used in the app, so fonts and sizes stay consistent and readable. */
export function AppText({ variant = 'body', className, color, align, weight, style, ...textProps }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontScale[variant]}
      {...textProps}
      className={cn('text-ink', variantClasses[variant], weight && weightClasses[weight], className)}
      style={[color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}
