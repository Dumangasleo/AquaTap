import { Children, Fragment, type ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';
import { colors, toneClasses, toneColors, type Tone } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/format';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** SECTION TITLE in uppercase with an optional action on the right. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="min-h-[28px] flex-row items-center justify-between gap-2 px-1">
      <AppText variant="overline" className="flex-1 text-[13px] leading-[18px]" accessibilityRole="header">
        {title}
      </AppText>
      {action}
    </View>
  );
}

/** "Label ........ Value" line used in summaries and receipts. */
export function KeyValueRow({
  label,
  value,
  isEmphasized = false,
  valueColor,
}: {
  label: string;
  value: string;
  isEmphasized?: boolean;
  valueColor?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 py-1.5">
      <AppText
        variant={isEmphasized ? 'bodyStrong' : 'body'}
        className={cn('flex-1', isEmphasized ? 'text-ink' : 'text-ink-muted')}
      >
        {label}
      </AppText>
      {/* The value may shrink and wrap too; without this, a long value squeezed the label until its words split. */}
      <AppText variant={isEmphasized ? 'heading' : 'bodyStrong'} color={valueColor} className="max-w-[60%] shrink text-right">
        {value}
      </AppText>
    </View>
  );
}

export function Divider({ className }: { className?: string }) {
  return <View className={cn('my-1 h-px bg-line', className)} />;
}

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: Tone;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

/** One tappable line of a menu or list (put several inside a <ListGroup>). */
export function ListRow({ title, subtitle, icon, iconTone = 'primary', right, onPress, showChevron = !!onPress }: ListRowProps) {
  const content = (
    <>
      {icon ? (
        <View className={cn('h-11 w-11 items-center justify-center rounded-[14px]', toneClasses[iconTone].background)}>
          <Icon name={icon} size={21} color={toneColors[iconTone].foreground} />
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" className="text-ink-muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {showChevron ? <Icon name="chevron-forward" size={20} color={colors.textSubtle} /> : null}
    </>
  );

  const rowClasses = 'min-h-[64px] flex-row items-center gap-3 bg-surface px-4 py-3';

  if (!onPress) return <View className={rowClasses}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      className={cn(rowClasses, 'active:bg-surface-muted')}
    >
      {content}
    </Pressable>
  );
}

/** Rounded white box that holds several <ListRow> items with thin lines between them. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  const rows = Children.toArray(children);
  return (
    <View className={cn('overflow-hidden rounded-card border border-line bg-surface', className)}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View className="ml-[72px] h-px bg-line" /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

interface AvatarProps {
  fullName: string | null | undefined;
  /** Profile photo (data URI or URL). Shows the initials when empty. */
  imageUri?: string | null;
  size?: number;
  className?: string;
}

/** Round profile photo, or the person's initials when there is no photo. */
export function Avatar({ fullName, imageUri, size = 44, className }: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        accessibilityLabel={fullName ? `Photo of ${fullName}` : 'Profile photo'}
        className={cn('bg-brand-soft', className)}
        style={dimensions}
      />
    );
  }

  return (
    <View className={cn('items-center justify-center bg-brand-soft', className)} style={dimensions}>
      <AppText className="font-heading text-brand" style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.5) }}>
        {getInitials(fullName)}
      </AppText>
    </View>
  );
}

/** Colored information box (tips, warnings, errors). */
export function Banner({
  tone = 'info',
  icon = 'information-circle',
  title,
  message,
  action,
}: {
  tone?: Tone;
  icon?: IconName;
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  const classes = toneClasses[tone];
  return (
    <View className={cn('flex-row items-start gap-3 rounded-[20px] p-4', classes.background)} accessibilityRole="alert">
      <Icon name={icon} size={22} color={toneColors[tone].foreground} />
      <View className="flex-1 gap-0.5">
        {title ? (
          <AppText variant="bodyStrong" className={classes.text}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" className="text-ink">
          {message}
        </AppText>
        {action}
      </View>
    </View>
  );
}
