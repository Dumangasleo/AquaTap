import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { customersApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import type { Coordinates } from '../../components/map/map.types';
import { SignatureImage } from '../../components/signature/SignatureImage';
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  Divider,
  ErrorView,
  KeyValueRow,
  ListGroup,
  ListRow,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  StatCard,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { GallonLedgerList } from '../../features/customer/GallonLedgerList';
import { LocationPickerField } from '../../features/onboarding/LocationPickerField';
import { ProfileSummaryCard } from '../../features/profile/ProfileSummaryCard';
import { queryKeys } from '../../hooks/query-keys';
import { useSignOut } from '../../hooks/use-sign-out';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import type { CustomerAccount } from '../../types/api.types';
import { formatDate } from '../../utils/format';

function EditDetailsSheet({ account, onClose }: { account: CustomerAccount; onClose: () => void }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [address, setAddress] = useState(account.address);
  const [landmark, setLandmark] = useState(account.landmark ?? '');
  const [contactNumber, setContactNumber] = useState(account.contactNumber);
  const [occupation, setOccupation] = useState(account.occupation ?? '');
  const [location, setLocation] = useState<Coordinates | null>(
    account.latitude && account.longitude ? { latitude: account.latitude, longitude: account.longitude } : null,
  );

  const update = useMutation({
    mutationFn: () =>
      customersApi.updateMyProfile({
        address: address.trim(),
        landmark: landmark.trim(),
        contactNumber: contactNumber.trim(),
        occupation: occupation.trim(),
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData(queryKeys.myAccount, updatedAccount);
      showToast('Your details were saved');
      onClose();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const saveDetails = async () => {
    const isConfirmed = await confirm({
      title: 'Save these details?',
      message: 'The rider will use them for your next deliveries.',
      details: [
        { label: 'Address', value: address.trim() },
        { label: 'Contact', value: contactNumber.trim() },
      ],
      confirmLabel: 'Yes, save',
      icon: 'home',
    });
    if (isConfirmed) update.mutate();
  };

  return (
    <BottomSheet
      isVisible
      title="Change my details"
      subtitle="Used for your next deliveries"
      onClose={onClose}
      footer={
        <Button label="Save changes" icon="save-outline" size="lg" fullWidth isLoading={update.isPending} onPress={() => void saveDetails()} />
      }
    >
      <TextField label="Complete address" value={address} onChangeText={setAddress} multiline leftIcon="home-outline" />
      <TextField label="Landmark" value={landmark} onChangeText={setLandmark} leftIcon="flag-outline" />
      <TextField label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" leftIcon="call-outline" />
      <TextField label="Work" value={occupation} onChangeText={setOccupation} leftIcon="briefcase-outline" />
      <LocationPickerField
        label="Delivery location"
        helperText="Move the map until the pin is on your house."
        value={location}
        onChange={setLocation}
      />
    </BottomSheet>
  );
}

export default function CustomerAccountScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const signOut = useSignOut();
  const [isEditing, setIsEditing] = useState(false);
  const [isAgreementExpanded, setIsAgreementExpanded] = useState(false);

  const accountQuery = useQuery({ queryKey: queryKeys.myAccount, queryFn: customersApi.getMyAccount });
  const ledgerQuery = useQuery({ queryKey: queryKeys.myLedger, queryFn: customersApi.getMyLedger });
  const account = accountQuery.data;
  const station = profile?.waterStation;

  return (
    <Screen
      header={<ScreenHeader title="My account" />}
      isRefreshing={accountQuery.isRefetching}
      onRefresh={() => {
        void accountQuery.refetch();
        void ledgerQuery.refetch();
      }}
    >
      <ProfileSummaryCard />

      {accountQuery.isLoading ? <LoadingView /> : null}
      {accountQuery.isError ? <ErrorView error={accountQuery.error} onRetry={() => void accountQuery.refetch()} /> : null}

      {account ? (
        <>
          <View className="flex-row flex-wrap gap-3">
            <StatCard label="Gallons with you" value={String(account.gallonBalance.remainingGallons)} icon="water-outline" />
            <StatCard label="Borrowed" value={String(account.gallonBalance.borrowedGallons)} icon="document-text-outline" tone="accent" />
            <StatCard label="Delivered" value={String(account.gallonBalance.gallonsDelivered)} icon="arrow-down-circle-outline" tone="info" />
            <StatCard label="Empty gallons returned" value={String(account.gallonBalance.gallonsReturned)} icon="arrow-up-circle-outline" tone="success" />
          </View>

          <SectionHeader
            title="Delivery details"
            action={<Button label="Change" icon="create-outline" variant="ghost" size="sm" onPress={() => setIsEditing(true)} />}
          />
          <Card>
            <KeyValueRow label="Address" value={account.address} />
            <KeyValueRow label="Landmark" value={account.landmark ?? '—'} />
            <KeyValueRow label="Contact" value={account.contactNumber} />
            <KeyValueRow label="Work" value={account.occupation ?? '—'} />
            <KeyValueRow
              label="Location on the map"
              value={account.latitude ? 'Saved' : 'Not set yet'}
              valueColor={account.latitude ? colors.success : colors.warning}
            />
          </Card>

          {account.contract ? (
            <>
              <SectionHeader title="My gallon agreement" />
              <Card className="gap-2">
                <KeyValueRow label="Gallons borrowed" value={String(account.contract.borrowedGallons)} isEmphasized />
                <KeyValueRow label="Signed on" value={formatDate(account.contract.signedAt)} />
                {account.contract.contractBody ? (
                  <>
                    <Divider />
                    <AppText className="leading-[25px]" numberOfLines={isAgreementExpanded ? undefined : 5}>
                      {account.contract.contractBody}
                    </AppText>
                    <Button
                      label={isAgreementExpanded ? 'Show less' : 'Read the full agreement'}
                      variant="ghost"
                      icon={isAgreementExpanded ? 'chevron-up' : 'chevron-down'}
                      onPress={() => setIsAgreementExpanded(!isAgreementExpanded)}
                    />
                  </>
                ) : null}
                <AppText variant="overline">Your signature</AppText>
                <SignatureImage signatureSvg={account.contract.signatureSvg} />
              </Card>
            </>
          ) : null}

          <SectionHeader title="Gallon history" />
          {ledgerQuery.isLoading ? <LoadingView /> : null}
          {ledgerQuery.data ? <GallonLedgerList entries={ledgerQuery.data} /> : null}

          <SectionHeader title="Station" />
          <ListGroup>
            <ListRow
              icon="wallet-outline"
              title="Ways to pay"
              subtitle="GCash and bank QR codes of the station"
              onPress={() => router.push('/pay')}
            />
            {station ? (
              <ListRow
                icon="call-outline"
                iconTone="success"
                title={`Call ${station.stationName}`}
                subtitle={`${station.contactNumber} · ${station.address}`}
                onPress={() => void Linking.openURL(`tel:${station.contactNumber}`)}
              />
            ) : null}
          </ListGroup>

          {isEditing ? <EditDetailsSheet account={account} onClose={() => setIsEditing(false)} /> : null}
        </>
      ) : null}

      <ListGroup>
        <ListRow icon="log-out-outline" iconTone="danger" title="Sign out" onPress={() => void signOut()} showChevron={false} />
      </ListGroup>
    </Screen>
  );
}
