import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText, Banner, Button, Card, Icon, Screen, type IconName } from '../../components/ui';
import { useSignOut } from '../../hooks/use-sign-out';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';

interface AccountTypeCardProps {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}

function AccountTypeCard({ icon, title, description, onPress }: AccountTypeCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={title} className="flex-row items-center gap-4 p-5">
      <View className="h-14 w-14 items-center justify-center rounded-field bg-brand-soft">
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <View className="flex-1 gap-1">
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" className="text-ink-muted">
          {description}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={22} color={colors.textSubtle} />
    </Card>
  );
}

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useSignOut();
  const firstName = profile?.fullName?.split(' ')[0];

  return (
    <Screen edges={['top', 'bottom']} contentClassName="w-full max-w-[560px] gap-4 self-center pt-6">
      <View className="mb-2 gap-1">
        <AppText variant="overline" className="text-brand">
          Welcome to AquaTap
        </AppText>
        <AppText variant="display">{firstName ? `Hi, ${firstName}!` : 'Hi there!'}</AppText>
        <AppText className="text-ink-muted">How will you use AquaTap? You only need to choose once.</AppText>
      </View>

      <AccountTypeCard
        icon="home-outline"
        title="I'm a customer"
        description="Order water from a refilling station, borrow gallons, and keep track of your orders and utang."
        onPress={() => router.push('/onboarding/customer')}
      />
      <AccountTypeCard
        icon="storefront-outline"
        title="I own a water refilling station"
        description="Register your station to get orders, add riders, and see your daily sales."
        onPress={() => router.push('/onboarding/station')}
      />

      <Banner
        tone="info"
        icon="people-outline"
        title="Do you work for a station?"
        message="Ask the station owner to add your Gmail address in AquaTap. Then sign out and sign in again. The rider app opens by itself."
      />

      <Button label={`Not ${profile?.email ?? 'you'}? Sign out`} variant="ghost" icon="log-out-outline" onPress={signOut} />
    </Screen>
  );
}
