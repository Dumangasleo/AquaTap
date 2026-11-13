import { ActivityIndicator, View } from 'react-native';
import { getErrorMessage } from '../../api/http-client';
import { colors } from '../../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const CONTAINER_CLASSES = 'items-center justify-center gap-3 px-6 py-10';

/** Friendly message when a list has nothing to show yet. */
export function EmptyState({ icon = 'file-tray-outline', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className={CONTAINER_CLASSES}>
      <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-soft">
        <Icon name={icon} size={32} color={colors.primary} />
      </View>
      <AppText variant="heading" className="text-center">
        {title}
      </AppText>
      {message ? <AppText className="text-center text-ink-muted">{message}</AppText> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

export function LoadingView({ message = 'Loading…' }: { message?: string }) {
  return (
    <View className={CONTAINER_CLASSES} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText className="text-ink-muted">{message}</AppText>
    </View>
  );
}

/** Shown when something could not be loaded, with a "Try again" button. */
export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View className={CONTAINER_CLASSES}>
      <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-danger-soft">
        <Icon name="cloud-offline-outline" size={32} color={colors.danger} />
      </View>
      <AppText variant="heading" className="text-center">
        Something went wrong
      </AppText>
      <AppText className="text-center text-ink-muted">{getErrorMessage(error)}</AppText>
      {onRetry ? <Button label="Try again" icon="refresh" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}
