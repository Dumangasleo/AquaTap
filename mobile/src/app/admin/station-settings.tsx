import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { waterStationsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import { LeafletMap } from '../../components/map/LeafletMap';
import type { Coordinates } from '../../components/map/map.types';
import {
  AppText,
  Badge,
  Banner,
  Button,
  Card,
  ErrorView,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { appConfig } from '../../config/app-config';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import type { UpdateWaterStationRequest, WaterStation } from '../../types/api.types';
import { formatCurrency } from '../../utils/format';
import { getCurrentCoordinates } from '../../utils/location';

const TEMPLATE_PLACEHOLDERS = ['{{FullName}}', '{{Address}}', '{{Occupation}}', '{{ContactNumber}}', '{{BorrowedGallons}}', '{{StationName}}', '{{Date}}'];

/** Admin: station details, price per gallon, map pin and the borrowing contract template. */
export default function StationSettingsScreen() {
  const stationQuery = useQuery({ queryKey: queryKeys.myStation, queryFn: waterStationsApi.getMyStation });

  return (
    <Screen header={<ScreenHeader title="Station settings" subtitle="What customers see about your station" showBackButton />}>
      {stationQuery.isLoading ? (
        <LoadingView message="Loading station…" />
      ) : stationQuery.isError || !stationQuery.data ? (
        <ErrorView error={stationQuery.error} onRetry={() => void stationQuery.refetch()} />
      ) : (
        <StationSettingsForm station={stationQuery.data} />
      )}
    </Screen>
  );
}

function StationSettingsForm({ station }: { station: WaterStation }) {
  const queryClient = useQueryClient();
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [stationName, setStationName] = useState(station.stationName);
  const [address, setAddress] = useState(station.address);
  const [contactNumber, setContactNumber] = useState(station.contactNumber);
  const [priceText, setPriceText] = useState(String(station.pricePerGallon));
  const [pin, setPin] = useState<Coordinates | null>(
    station.latitude !== null && station.longitude !== null ? { latitude: station.latitude, longitude: station.longitude } : null,
  );
  const [mapCenter, setMapCenter] = useState<Coordinates>(pin ?? appConfig.defaultMapCenter);
  const [contractTemplate, setContractTemplate] = useState(station.contractTemplate);

  useEffect(() => {
    setContractTemplate(station.contractTemplate);
  }, [station.contractTemplate]);

  const pricePerGallon = Number(priceText);
  const isPriceValid = Number.isFinite(pricePerGallon) && pricePerGallon >= 1;

  const updateMutation = useMutation({
    mutationFn: (request: UpdateWaterStationRequest) => waterStationsApi.updateMyStation(request),
    onSuccess: (updatedStation) => {
      queryClient.setQueryData(queryKeys.myStation, updatedStation);
      void queryClient.invalidateQueries({ queryKey: queryKeys.stations });
      void refreshProfile();
      showToast('Station settings saved.');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const saveDetails = async () => {
    const isConfirmed = await confirm({
      title: 'Save your station details?',
      message: 'Customers will see these details. New orders will use the new price.',
      details: [
        { label: 'Station', value: stationName.trim() },
        { label: 'Price per gallon', value: formatCurrency(Math.round(pricePerGallon * 100) / 100) },
        { label: 'Contact', value: contactNumber.trim() },
      ],
      confirmLabel: 'Yes, save',
      icon: 'storefront',
    });
    if (!isConfirmed) return;
    updateMutation.mutate({
      stationName: stationName.trim(),
      address: address.trim(),
      contactNumber: contactNumber.trim(),
      pricePerGallon: Math.round(pricePerGallon * 100) / 100,
      ...(pin ? { latitude: pin.latitude, longitude: pin.longitude } : {}),
    });
  };

  const pinCurrentLocation = async () => {
    const coordinates = await getCurrentCoordinates();
    if (!coordinates) {
      showToast('Location permission is needed to use your current location.', 'error');
      return;
    }
    setMapCenter(coordinates);
    setPin(coordinates);
  };

  const resetTemplate = async () => {
    const isConfirmed = await confirm({
      title: 'Go back to the standard contract?',
      message: 'Your own contract text will be replaced with the AquaTap standard contract.',
      confirmLabel: 'Yes, use standard',
      tone: 'danger',
      icon: 'refresh',
    });
    if (isConfirmed) updateMutation.mutate({ contractTemplate: '' });
  };

  const saveContract = async () => {
    const isConfirmed = await confirm({
      title: 'Save this contract?',
      message: 'New customers will sign this contract when they borrow gallons.',
      confirmLabel: 'Yes, save contract',
      icon: 'document-text',
    });
    if (isConfirmed) updateMutation.mutate({ contractTemplate });
  };

  const isDetailsValid = stationName.trim().length >= 3 && address.trim().length >= 5 && contactNumber.trim().length >= 7 && isPriceValid;

  return (
    <>
      <SectionHeader title="Station details" />
      <Card className="gap-4">
        <TextField label="Station name" isRequired value={stationName} onChangeText={setStationName} />
        <TextField label="Address" isRequired value={address} onChangeText={setAddress} multiline />
        <TextField label="Contact number" isRequired value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
        <TextField
          label="Price per gallon"
          isRequired
          prefix="₱"
          keyboardType="decimal-pad"
          value={priceText}
          onChangeText={(text) => setPriceText(text.replace(/[^0-9.]/g, ''))}
          helperText="New orders use this price. Old orders keep the price at the time they were ordered."
          errorText={!isPriceValid ? 'Enter a price of at least ₱1.' : null}
        />
      </Card>

      <SectionHeader title="Station location" />
      <AppText variant="caption" className="px-1 text-ink-muted">
        Move the map so the red pin is on your station.
      </AppText>
      <LeafletMap
        isPicker
        center={mapCenter}
        zoom={16}
        height={260}
        markers={pin ? [{ id: 'station', kind: 'station', ...pin }] : []}
        onLocationPick={setPin}
      />
      <Button label="Use my current location" icon="locate-outline" variant="outline" onPress={() => void pinCurrentLocation()} />

      <Button
        label="Save station details"
        icon="save-outline"
        size="lg"
        fullWidth
        isDisabled={!isDetailsValid}
        isLoading={updateMutation.isPending}
        onPress={() => void saveDetails()}
      />

      <SectionHeader
        title="Gallon borrowing contract"
        action={station.usesDefaultContractTemplate ? <Badge label="Standard" tone="neutral" /> : <Badge label="Custom" tone="accent" />}
      />
      <Banner
        tone="info"
        title="Words that fill in by themselves"
        message={`These are replaced with the customer's details when they sign: ${TEMPLATE_PLACEHOLDERS.join('  ')}`}
      />
      <TextField
        label="Contract text"
        multiline
        value={contractTemplate}
        onChangeText={setContractTemplate}
        className="min-h-[280px]"
        autoCapitalize="sentences"
      />
      <View className="flex-row items-center gap-2">
        <Button label="Use standard" icon="refresh" variant="ghost" onPress={() => void resetTemplate()} />
        <Button
          label="Save contract"
          icon="document-text-outline"
          className="flex-1"
          isDisabled={contractTemplate.trim().length < 20}
          isLoading={updateMutation.isPending}
          onPress={() => void saveContract()}
        />
      </View>
    </>
  );
}
