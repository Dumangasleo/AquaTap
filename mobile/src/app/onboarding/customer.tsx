import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { customersApi, waterStationsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import type { Coordinates } from '../../components/map/map.types';
import { SignaturePad } from '../../components/signature/SignaturePad';
import {
  AppText,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorView,
  Icon,
  LoadingView,
  NumberStepper,
  OptionCards,
  Screen,
  ScreenHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { renderContractPreview } from '../../features/onboarding/contract-template';
import { LocationPickerField } from '../../features/onboarding/LocationPickerField';
import { StepProgress } from '../../features/onboarding/StepProgress';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import type { WaterStationSummary } from '../../types/api.types';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';

const STEP_TITLES = ['Your name and station', 'Your address', 'Gallon agreement'];

type ContractOption = 'withTemplate' | 'detailsOnly';
type FieldErrors = Partial<Record<'fullName' | 'station' | 'address' | 'contactNumber' | 'signature' | 'agreement', string>>;

function StationOption({
  station,
  isSelected,
  onSelect,
}: {
  station: WaterStationSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${station.stationName}, ${station.address}`}
      onPress={onSelect}
      className={cn(
        'flex-row items-center gap-3 rounded-card border-[1.5px] p-4',
        isSelected ? 'border-brand bg-brand-soft' : 'border-line bg-surface active:bg-surface-muted',
      )}
    >
      <View className={cn('h-11 w-11 items-center justify-center rounded-field', isSelected ? 'bg-brand' : 'bg-brand-soft')}>
        <Icon name="water" size={22} color={isSelected ? colors.textOnPrimary : colors.primary} />
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong">{station.stationName}</AppText>
        <AppText variant="caption" className="text-ink-muted" numberOfLines={2}>
          {station.address}
        </AppText>
        <AppText variant="caption" className="font-heading text-brand">
          {formatCurrency(station.pricePerGallon)} per gallon
        </AppText>
      </View>
      {isSelected ? <Icon name="checkmark-circle" size={26} color={colors.primary} /> : null}
    </Pressable>
  );
}

/**
 * Customer onboarding = electronic gallon borrowing contract.
 * Step 1: full name + station, Step 2: address & map pin, Step 3: borrowed gallons, contract & signature.
 */
export default function CustomerRegistrationScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [occupation, setOccupation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<Coordinates | null>(null);
  const [borrowedGallons, setBorrowedGallons] = useState(2);
  const [contractOption, setContractOption] = useState<ContractOption>('withTemplate');
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /** Clears a field's error as soon as the user edits it. */
  const clearError = (field: keyof FieldErrors) =>
    setFieldErrors((previousErrors) => (previousErrors[field] ? { ...previousErrors, [field]: undefined } : previousErrors));
  const withErrorReset =
    <TValue,>(setValue: (value: TValue) => void, field: keyof FieldErrors) =>
    (value: TValue) => {
      setValue(value);
      clearError(field);
    };

  const stationsQuery = useQuery({ queryKey: queryKeys.stations, queryFn: waterStationsApi.listStations });
  const selectedStation = stationsQuery.data?.find((station) => station.waterStationId === selectedStationId) ?? null;
  const templateQuery = useQuery({
    queryKey: queryKeys.contractTemplate(selectedStationId ?? 0),
    queryFn: () => waterStationsApi.getContractTemplate(selectedStationId!),
    enabled: selectedStationId !== null,
  });

  const registration = useMutation({
    mutationFn: () =>
      customersApi.register({
        waterStationId: selectedStationId!,
        fullName: fullName.trim(),
        address: address.trim(),
        occupation: occupation.trim() || undefined,
        contactNumber: contactNumber.trim(),
        landmark: landmark.trim() || undefined,
        latitude: deliveryLocation?.latitude,
        longitude: deliveryLocation?.longitude,
        borrowedGallons,
        signatureSvg: signatureSvg!,
        useContractTemplate: contractOption === 'withTemplate',
      }),
    onSuccess: async () => {
      await refreshProfile();
      showToast('Welcome! Your agreement is saved.');
      router.replace('/customer');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const validateStep = (step: number): boolean => {
    const errors: FieldErrors = {};
    if (step === 1) {
      if (fullName.trim().split(/\s+/).length < 2) errors.fullName = 'Please enter your complete name (first and last name).';
      if (!selectedStationId) errors.station = 'Please choose your water refilling station.';
    }
    if (step === 2) {
      if (address.trim().length < 5) errors.address = 'Please enter your complete address.';
      if (contactNumber.replace(/\D/g, '').length < 7) errors.contactNumber = 'Please enter a valid contact number.';
    }
    if (step === 3) {
      if (!signatureSvg) errors.signature = 'Please sign in the box above.';
      if (!hasAgreed) errors.agreement = 'Please tick the box to confirm your details are correct.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEP_TITLES.length) {
      setCurrentStep(currentStep + 1);
      return;
    }

    const isConfirmed = await confirm({
      title: 'Sign the agreement?',
      message: 'Your signature and details will be saved with this station.',
      details: [
        { label: 'Name', value: fullName.trim().replace(/\s+/g, ' ') },
        { label: 'Station', value: selectedStation?.stationName ?? '' },
        { label: 'Gallons borrowed', value: `${borrowedGallons} ${borrowedGallons === 1 ? 'gallon' : 'gallons'}` },
      ],
      confirmLabel: 'Yes, sign and finish',
      icon: 'create-outline',
    });
    if (isConfirmed) registration.mutate();
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else router.back();
  };

  const contractPreview =
    templateQuery.data && selectedStation
      ? renderContractPreview(templateQuery.data.contractTemplate, {
          fullName,
          address,
          occupation,
          contactNumber,
          borrowedGallons,
          stationName: selectedStation.stationName,
        })
      : null;

  const stationCenter =
    selectedStation?.latitude && selectedStation.longitude
      ? { latitude: selectedStation.latitude, longitude: selectedStation.longitude }
      : null;

  return (
    <Screen
      key={`step-${currentStep}`}
      scrollEnabled={!isSigning}
      edges={['top', 'bottom']}
      header={<ScreenHeader title="Sign up as a customer" showBackButton onBackPress={goBack} />}
      footer={
        <View className="flex-row gap-2">
          {currentStep > 1 ? <Button label="Back" variant="outline" size="lg" onPress={goBack} className="min-w-[96px]" /> : null}
          <Button
            label={currentStep === STEP_TITLES.length ? 'Sign and finish' : 'Continue'}
            icon={currentStep === STEP_TITLES.length ? 'checkmark-done' : 'arrow-forward'}
            iconPosition="right"
            size="lg"
            onPress={() => void goNext()}
            isLoading={registration.isPending}
            className="flex-1"
          />
        </View>
      }
    >
      <StepProgress currentStep={currentStep} stepTitles={STEP_TITLES} />

      {currentStep === 1 ? (
        <>
          <TextField
            label="Complete name"
            isRequired
            value={fullName}
            onChangeText={withErrorReset(setFullName, 'fullName')}
            placeholder="e.g. Leo Isidro Dumangas"
            autoCapitalize="words"
            helperText={fullName.trim() ? `Saved as: ${fullName.trim().replace(/\s+/g, ' ').toUpperCase()}` : 'First, middle and last name'}
            errorText={fieldErrors.fullName}
            leftIcon="person-outline"
          />

          <View className="gap-3">
            <View className="gap-1">
              <AppText variant="overline">
                Your refilling station <AppText variant="overline" className="text-danger">*</AppText>
              </AppText>
              <AppText variant="caption" className="text-ink-subtle">
                Your orders, gallons and utang are kept with this station.
              </AppText>
            </View>
            {stationsQuery.isLoading ? <LoadingView message="Loading stations…" /> : null}
            {stationsQuery.isError ? <ErrorView error={stationsQuery.error} onRetry={() => void stationsQuery.refetch()} /> : null}
            {stationsQuery.data?.length === 0 ? (
              <EmptyState icon="storefront-outline" title="No stations yet" message="No refilling station has joined AquaTap yet." />
            ) : null}
            {stationsQuery.data?.map((station) => (
              <StationOption
                key={station.waterStationId}
                station={station}
                isSelected={station.waterStationId === selectedStationId}
                onSelect={() => withErrorReset(setSelectedStationId, 'station')(station.waterStationId)}
              />
            ))}
            {fieldErrors.station ? (
              <AppText variant="caption" className="text-danger">
                {fieldErrors.station}
              </AppText>
            ) : null}
          </View>
        </>
      ) : null}

      {currentStep === 2 ? (
        <>
          <TextField
            label="Complete address"
            isRequired
            value={address}
            onChangeText={withErrorReset(setAddress, 'address')}
            placeholder="House no., street, purok, barangay, city"
            errorText={fieldErrors.address}
            leftIcon="home-outline"
            multiline
          />
          <TextField
            label="Landmark"
            value={landmark}
            onChangeText={setLandmark}
            placeholder="e.g. Blue gate near the chapel"
            leftIcon="flag-outline"
            helperText="Helps the rider find your house faster."
          />
          <TextField
            label="Contact number"
            isRequired
            value={contactNumber}
            onChangeText={withErrorReset(setContactNumber, 'contactNumber')}
            placeholder="09XX XXX XXXX"
            keyboardType="phone-pad"
            errorText={fieldErrors.contactNumber}
            leftIcon="call-outline"
          />
          <TextField
            label="Occupation"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="e.g. Teacher, Store owner"
            leftIcon="briefcase-outline"
          />
          <LocationPickerField
            label="Delivery location"
            helperText="Move the map so the red pin is on your house. The rider will see this pin."
            value={deliveryLocation}
            onChange={setDeliveryLocation}
            initialCenter={stationCenter}
          />
        </>
      ) : null}

      {currentStep === 3 && selectedStation ? (
        <>
          <NumberStepper
            label="Gallons you will borrow"
            value={borrowedGallons}
            onChange={setBorrowedGallons}
            min={0}
            max={50}
            unit="gallons"
            helperText="This is how many gallons you start with. You return them to the station later."
          />

          <OptionCards<ContractOption>
            label="Agreement type"
            columns={2}
            value={contractOption}
            onChange={setContractOption}
            options={[
              { value: 'withTemplate', title: 'Full agreement', description: "The station's written agreement", icon: 'document-text-outline' },
              { value: 'detailsOnly', title: 'Details only', description: 'Only your details and signature', icon: 'id-card-outline' },
            ]}
          />

          {contractOption === 'withTemplate' ? (
            <Card className="gap-3 bg-[#FFFDF7]">
              <View className="flex-row items-center gap-2">
                <Icon name="document-text" size={20} color={colors.primary} />
                <AppText variant="bodyStrong" className="flex-1">
                  Agreement preview
                </AppText>
                <Badge label={selectedStation.stationName} tone="primary" />
              </View>
              {templateQuery.isLoading ? <LoadingView message="Loading agreement…" /> : null}
              {contractPreview ? <AppText className="leading-[25px]">{contractPreview}</AppText> : null}
            </Card>
          ) : (
            <Banner
              tone="info"
              message="Only your details, the gallons you borrow and your signature are saved. There is no written agreement."
            />
          )}

          <View className="gap-2">
            <AppText variant="overline">
              Signature <AppText variant="overline" className="text-danger">*</AppText>
            </AppText>
            <SignaturePad onChange={withErrorReset(setSignatureSvg, 'signature')} onDrawingChange={setIsSigning} />
            {fieldErrors.signature ? (
              <AppText variant="caption" className="text-danger">
                {fieldErrors.signature}
              </AppText>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: hasAgreed }}
            onPress={() => withErrorReset(setHasAgreed, 'agreement')(!hasAgreed)}
            className="flex-row items-start gap-3 py-1"
          >
            <View
              className={cn(
                'h-7 w-7 items-center justify-center rounded-lg border-2',
                hasAgreed ? 'border-brand bg-brand' : 'border-line-strong bg-surface',
              )}
            >
              {hasAgreed ? <Icon name="checkmark" size={18} color={colors.textOnPrimary} /> : null}
            </View>
            <AppText className="flex-1">
              I confirm my details are true and I agree to borrow {borrowedGallons} gallon
              {borrowedGallons === 1 ? '' : 's'} from {selectedStation.stationName}.
            </AppText>
          </Pressable>
          {fieldErrors.agreement ? (
            <AppText variant="caption" className="text-danger">
              {fieldErrors.agreement}
            </AppText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
