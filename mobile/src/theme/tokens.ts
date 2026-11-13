/**
 * AquaTap design tokens in JavaScript ("Soft Aqua" theme).
 *
 * Screens are styled with Tailwind classes (see src/global.css, e.g. `bg-brand`, `text-ink-muted`).
 * These constants mirror the same colors for the places where a class cannot be used:
 * icon colors, SVG shapes, the map and navigation options. Keep both files in sync.
 */

export const colors = {
  primary: '#0369A1',
  primaryPressed: '#075985',
  primaryDeep: '#0C4A6E',
  primarySoft: '#E0F2FE',
  primaryBorder: '#BAE6FD',

  accent: '#0E7490',
  accentBright: '#06B6D4',
  accentSoft: '#CFFAFE',

  background: '#F0F9FF',
  surface: '#FFFFFF',
  surfaceMuted: '#E9F5FB',
  border: '#E0F0F8',
  borderStrong: '#BCDCEB',

  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#5B6B80',
  textOnPrimary: '#FFFFFF',

  success: '#0B7A55',
  successPressed: '#0A6647',
  successSoft: '#DCF7EA',
  warning: '#A15C07',
  warningSoft: '#FEF3C7',
  danger: '#D92D20',
  dangerPressed: '#B42318',
  dangerSoft: '#FEE4E2',
  info: '#0E7490',
  infoSoft: '#CFFAFE',
  neutralSoft: '#EEF4F8',

  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

/**
 * Font families: Nunito Sans for text and labels, Varela Round (one weight) for titles and big numbers.
 * Android needs one family name per weight.
 */
export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
  display: 'VarelaRound_400Regular',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Minimum touch target (Material / Apple HIG guideline). */
export const MIN_TOUCH_SIZE = 48;

/** Semantic tones shared by badges, stat cards, banners and dialogs. */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

export const toneColors: Record<Tone, { foreground: string; background: string }> = {
  primary: { foreground: colors.primary, background: colors.primarySoft },
  success: { foreground: colors.success, background: colors.successSoft },
  warning: { foreground: colors.warning, background: colors.warningSoft },
  danger: { foreground: colors.danger, background: colors.dangerSoft },
  info: { foreground: colors.info, background: colors.infoSoft },
  neutral: { foreground: colors.textMuted, background: colors.neutralSoft },
  accent: { foreground: colors.accent, background: colors.accentSoft },
};

/** The same tones as Tailwind classes (full class names so Tailwind can find them). */
export const toneClasses: Record<Tone, { text: string; background: string; border: string }> = {
  primary: { text: 'text-brand', background: 'bg-brand-soft', border: 'border-brand' },
  success: { text: 'text-success', background: 'bg-success-soft', border: 'border-success' },
  warning: { text: 'text-warning', background: 'bg-warning-soft', border: 'border-warning' },
  danger: { text: 'text-danger', background: 'bg-danger-soft', border: 'border-danger' },
  info: { text: 'text-info', background: 'bg-info-soft', border: 'border-info' },
  neutral: { text: 'text-ink-muted', background: 'bg-neutral-soft', border: 'border-line-strong' },
  accent: { text: 'text-aqua', background: 'bg-aqua-soft', border: 'border-aqua' },
};
