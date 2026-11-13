import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { waterStationsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import type { Coordinates } from '../../components/map/map.types';
import { AppText, Banner, Button, Screen, ScreenHeader, TextField, useConfirm, useToast } from '../../components/ui';
import { LocationPickerField } from '../../features/onboarding/LocationPickerField';
import { useAuthStore } from '../../store/auth-store';
import { formatCurrency } from '../../utils/format';

type FieldErrors = Partial<Record<'ownerFullName' | 'stationName' | 'address' | 'contactNumber' | 'pricePerGallon', string>>;

/** Station owner onboarding: creates the water refilling station and opens the admin app. */
export default function StationRegistrationScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [ownerFullName, setOwnerFullName] = useState(profile?.fullName ?? '');
  const [stationName, setStationName] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [pricePerGallon, setPricePerGallon] = useState('25');
  const [stationLocation, setStationLocation] = useState<Coordinates | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const registration = useMutation({
    mutationFn: () =>
      waterStationsApi.registerStation({
        ownerFullName: ownerFullName.trim(),
        stationName: stationName.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        pricePerGallon: Number(pricePerGallon),
        latitude: stationLocation?.latitude,
        longitude: stationLocation?.longitude,
      }),
    onSuccess: async () => {
      await refreshProfile();
      showToast('Station created. Next, send your business documents.');
      router.replace('/station-verification');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const handleSubmit = async () => {
    const errors: FieldErrors = {};
    if (ownerFullName.trim().split(/\s+/).length < 2) errors.ownerFullName = 'Please enter your complete name.';
    if (stationName.trim().length < 3) errors.stationName = 'Please enter the station name.';
    if (address.trim().length < 5) errors.address = 'Please enter the complete station address.';
    if (contactNumber.replace(/\D/g, '').length < 7) errors.contactNumber = 'Please enter a valid contact number.';
    const price = Number(pricePerGallon);
    if (!Number.isFinite(price) || price < 1) errors.pricePerGallon = 'Enter the price of one gallon (e.g. 25).';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const isConfirmed = await confirm({
      title: 'Create your station?',
      message: 'You will be the admin of this station. You can add riders after this.',
      details: [
        { label: 'Station', value: stationName.trim() },
        { label: 'Owner', value: ownerFullName.trim() },
        { label: 'Price per gallon', value: formatCurrency(price) },
      ],
      confirmLabel: 'Yes, create station',
      icon: 'storefront',
    });
    if (isConfirmed) registration.mutate();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<ScreenHeader title="Register your station" subtitle="You will be the admin of this station" showBackButton />}
      footer={
        <Button
          label="Create my station"
          icon="storefront"
          size="lg"
          fullWidth
          isLoading={registration.isPending}
          onPress={() => void handleSubmit()}
        />
      }
    >
      <TextField
        label="Owner's complete name"
        isRequired
        value={ownerFullName}
        onChangeText={setOwnerFullName}
        placeholder="e.g. Leo Isidro Dumangas"
        autoCapitalize="words"
        leftIcon="person-outline"
        errorText={fieldErrors.ownerFullName}
      />
      <TextField
        label="Station name"
        isRequired
        value={stationName}
        onChangeText={setStationName}
        placeholder="e.g. Crystal Clear Water Refilling"
        leftIcon="storefront-outline"
        errorText={fieldErrors.stationName}
      />
      <TextField
        label="Station address"
        isRequired
        value={address}
        onChangeText={setAddress}
        placeholder="Street, barangay, city"
        leftIcon="location-outline"
        errorText={fieldErrors.address}
        multiline
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <TextField
            label="Contact number"
            isRequired
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            placeholder="09XX XXX XXXX"
            errorText={fieldErrors.contactNumber}
          />
        </View>
        <View className="w-[140px]">
          <TextField
            label="Price per gallon"
            isRequired
            value={pricePerGallon}
            onChangeText={setPricePerGallon}
            keyboardType="decimal-pad"
            prefix="₱"
            errorText={fieldErrors.pricePerGallon}
          />
        </View>
      </View>
      <LocationPickerField
        label="Station location"
        helperText="Place the pin on your station so customers and riders can see it on the map."
        value={stationLocation}
        onChange={setStationLocation}
      />
      <Banner
        tone="info"
        icon="shield-checkmark-outline"
        title="Next: business documents"
        message="You will upload your BIR Certificate of Registration, Mayor's permit, DTI/SEC, sanitary permit, water test result and a valid ID. Customers can find your station once AquaTap approves it."
      />
      <AppText variant="caption" className="text-center text-ink-subtle">
        Signed in as {profile?.email}
      </AppText>
    </Screen>
  );
}
