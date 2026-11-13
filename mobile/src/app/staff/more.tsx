import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { AppText, Card, ListGroup, ListRow, Screen, ScreenHeader, SectionHeader } from '../../components/ui';
import { ProfileSummaryCard } from '../../features/profile/ProfileSummaryCard';
import { verificationStatusDetails } from '../../features/station-verification/kyb-labels';
import { useSignOut } from '../../hooks/use-sign-out';
import { useAuthStore } from '../../store/auth-store';
import { useServerAddressStore } from '../../store/server-address-store';
import { formatCurrency } from '../../utils/format';

export default function StaffMoreScreen() {
  const router = useRouter();
  const signOut = useSignOut();
  const profile = useAuthStore((state) => state.profile);
  const apiBaseUrl = useServerAddressStore((state) => state.apiBaseUrl);
  const isAdmin = profile?.role === 'Admin';
  const station = profile?.waterStation;

  return (
    <Screen header={<ScreenHeader title="Menu" />}>
      <ProfileSummaryCard />

      {station ? (
        <Card className="gap-1">
          <AppText variant="overline">Water refilling station</AppText>
          <AppText variant="heading">{station.stationName}</AppText>
          <AppText variant="caption" className="text-ink-muted">
            {station.address}
          </AppText>
          <View className="mt-2 flex-row gap-6">
            <View>
              <AppText variant="overline">Price per gallon</AppText>
              <AppText variant="bodyStrong">{formatCurrency(station.pricePerGallon)}</AppText>
            </View>
            <View className="flex-1">
              <AppText variant="overline">Contact</AppText>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {station.contactNumber}
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Station" />
      <ListGroup>
        <ListRow
          title="Customers"
          subtitle="Agreements, gallons and utang of each customer"
          icon="people-outline"
          onPress={() => router.push('/customers')}
        />
      </ListGroup>

      {isAdmin ? (
        <>
          <SectionHeader title="For the owner" />
          <ListGroup>
            <ListRow
              title="Sales and income reports"
              subtitle="Sales, expenses, gallons and new customers per month"
              icon="bar-chart-outline"
              iconTone="accent"
              onPress={() => router.push('/admin/reports')}
            />
            <ListRow
              title="Employees"
              subtitle="Add riders and staff using their Gmail"
              icon="id-card-outline"
              iconTone="info"
              onPress={() => router.push('/admin/employees')}
            />
            <ListRow
              title="GCash and bank accounts"
              subtitle="Where customers send their payment (QR code)"
              icon="qr-code-outline"
              iconTone="success"
              onPress={() => router.push('/admin/payment-channels')}
            />
            <ListRow
              title="Business documents"
              subtitle={`BIR, permits and water test · ${verificationStatusDetails[station?.verificationStatus ?? 'NotSubmitted'].label}`}
              icon="shield-checkmark-outline"
              iconTone={station?.verificationStatus === 'Verified' ? 'success' : 'warning'}
              onPress={() => router.push('/station-verification')}
            />
            <ListRow
              title="Station details and agreement"
              subtitle="Price per gallon, address, gallon-borrowing agreement"
              icon="settings-outline"
              iconTone="neutral"
              onPress={() => router.push('/admin/station-settings')}
            />
          </ListGroup>
        </>
      ) : null}

      <ListGroup>
        <ListRow title="Sign out" icon="log-out-outline" iconTone="danger" onPress={() => void signOut()} showChevron={false} />
      </ListGroup>

      <AppText variant="tiny" className="text-center text-ink-subtle">
        AquaTap · Server {apiBaseUrl}
      </AppText>
    </Screen>
  );
}
