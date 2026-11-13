import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, Badge, Card, Icon } from '../../components/ui';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import { getRoleLabel } from './profile-labels';

/** Photo, name and role of the signed-in user. Tapping it opens "My profile". */
export function ProfileSummaryCard() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  if (!profile) return null;

  return (
    <Card
      className="flex-row items-center gap-4"
      onPress={() => router.push('/profile')}
      accessibilityLabel={`${profile.fullName ?? profile.email}. Open my profile and security`}
    >
      <Avatar fullName={profile.fullName} imageUri={profile.avatarImage} size={64} />
      <View className="flex-1 gap-1">
        <AppText variant="heading" numberOfLines={2}>
          {profile.fullName ?? 'Your name'}
        </AppText>
        <AppText variant="caption" className="text-ink-muted" numberOfLines={1}>
          {profile.email}
        </AppText>
        <Badge label={getRoleLabel(profile)} tone="primary" icon="shield-checkmark-outline" />
      </View>
      <View className="items-center gap-0.5">
        <Icon name="chevron-forward" size={22} color={colors.textSubtle} />
      </View>
    </Card>
  );
}
