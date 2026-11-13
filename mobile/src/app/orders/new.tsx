import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { customersApi, ordersApi, paymentChannelsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import type { Coordinates } from '../../components/map/map.types';
import {
  AppText,
  Banner,
  Button,
  Card,
  Divider,
  ErrorView,
  KeyValueRow,
  LoadingView,
  NumberStepper,
  OptionCards,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { LocationPickerField } from '../../features/onboarding/LocationPickerField';
import { PaymentChannelCard } from '../../features/payments/PaymentChannelCard';
import { queryKeys } from '../../hooks/query-keys';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';
import type { PaymentMode, PaymentType } from '../../types/api.types';
import { formatCurrency } from '../../utils/format';

type DeliveryChoice = 'savedAddress' | 'otherAddress';

export default function NewOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const station = useAuthStore((state) => state.profile?.waterStation);

  const accountQuery = useQuery({ queryKey: queryKeys.myAccount, queryFn: customersApi.getMyAccount });
  const channelsQuery = useQuery({ queryKey: queryKeys.paymentChannels, queryFn: paymentChannelsApi.list });

  const [gallonsOrdered, setGallonsOrdered] = useState(1);
  const [returnedGallons, setReturnedGallons] = useState<number | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [deliveryChoice, setDeliveryChoice] = useState<DeliveryChoice>('savedAddress');
  const [otherAddress, setOtherAddress] = useState('');
  const [otherLocation, setOtherLocation] = useState<Coordinates | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');

  const account = accountQuery.data;
  const remainingGallons = account?.gallonBalance.remainingGallons ?? 0;
  // By default the customer returns as many empties as they order (swap), limited by what they hold.
  const emptiesToReturn = returnedGallons ?? Math.min(gallonsOrdered, remainingGallons);
  const pricePerGallon = station?.pricePerGallon ?? 0;
  const totalAmount = gallonsOrdered * pricePerGallon;
  const gallonsAfterDelivery = remainingGallons + gallonsOrdered - emptiesToReturn;
  const isOnlinePayment = paymentType === 'Cash' && paymentMode !== 'Cash';
  const matchingChannels = (channelsQuery.data ?? []).filter((channel) => channel.channelType === paymentMode);

  const placeOrder = useMutation({
    mutationFn: () =>
      ordersApi.placeOrder({
        gallonsOrdered,
        returnedGallons: emptiesToReturn,
        paymentType,
        paymentMode: paymentType === 'Cash' ? paymentMode : undefined,
        paymentReference: isOnlinePayment && paymentReference.trim() ? paymentReference.trim() : undefined,
        deliveryAddress: deliveryChoice === 'otherAddress' ? otherAddress.trim() : undefined,
        deliveryLatitude: deliveryChoice === 'otherAddress' ? otherLocation?.latitude : undefined,
        deliveryLongitude: deliveryChoice === 'otherAddress' ? otherLocation?.longitude : undefined,
        customerNotes: customerNotes.trim() || undefined,
      }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myAccount });
      showToast('Order sent. Waiting for the station to accept.');
      router.replace(`/orders/${order.customerOrderId}`);
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const paymentLabel =
    paymentType === 'Credit' ? 'Utang (pay later)' : paymentMode === 'BankTransfer' ? 'Bank transfer' : paymentMode;

  const handleSubmit = async () => {
    if (deliveryChoice === 'otherAddress' && otherAddress.trim().length < 5) {
      showToast('Please enter the delivery address.', 'error');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Place this order?',
      message: 'The station will be told right away.',
      details: [
        { label: 'Gallons', value: `${gallonsOrdered} ${gallonsOrdered === 1 ? 'gallon' : 'gallons'}` },
        { label: 'Empty gallons to return', value: String(emptiesToReturn) },
        { label: 'Total', value: formatCurrency(totalAmount) },
        { label: 'Payment', value: paymentLabel },
      ],
      confirmLabel: 'Yes, place order',
      icon: 'water',
    });
    if (isConfirmed) placeOrder.mutate();
  };

  if (accountQuery.isLoading) return <LoadingView />;
  if (accountQuery.isError || !account) {
    return (
      <Screen header={<ScreenHeader title="Order water" showBackButton />}>
        <ErrorView error={accountQuery.error} onRetry={() => void accountQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<ScreenHeader title="Order water" subtitle={station?.stationName} showBackButton />}
      footer={
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <AppText variant="overline">Total</AppText>
            <AppText variant="title" className="text-brand">
              {formatCurrency(totalAmount)}
            </AppText>
          </View>
          <Button
            label="Place order"
            icon="send"
            size="lg"
            isLoading={placeOrder.isPending}
            onPress={() => void handleSubmit()}
            className="flex-1"
          />
        </View>
      }
    >
      <NumberStepper
        label="Gallons to order"
        value={gallonsOrdered}
        onChange={setGallonsOrdered}
        min={1}
        max={30}
        helperText={`${formatCurrency(pricePerGallon)} per gallon`}
      />
      <NumberStepper
        label="Empty gallons to return"
        value={emptiesToReturn}
        onChange={setReturnedGallons}
        min={0}
        max={remainingGallons}
        unit="empty gallons"
        helperText={`You have ${remainingGallons} of the station's gallons now. After this delivery you will have ${gallonsAfterDelivery}.`}
      />

      <OptionCards<PaymentType>
        label="How will you pay?"
        value={paymentType}
        onChange={setPaymentType}
        options={[
          { value: 'Cash', title: 'Pay now', description: 'Cash, GCash or bank', icon: 'cash-outline' },
          { value: 'Credit', title: 'Utang', description: 'Pay later', icon: 'time-outline' },
        ]}
      />

      {paymentType === 'Cash' ? (
        <OptionCards<PaymentMode>
          label="Pay with"
          columns={3}
          value={paymentMode}
          onChange={setPaymentMode}
          options={[
            { value: 'Cash', title: 'Cash', icon: 'cash-outline' },
            { value: 'GCash', title: 'GCash', icon: 'phone-portrait-outline' },
            { value: 'BankTransfer', title: 'Bank', icon: 'business-outline' },
          ]}
        />
      ) : (
        <Banner
          tone="warning"
          icon="time-outline"
          message="This order is added to your utang. You can see it anytime in My orders, under Not yet paid."
        />
      )}

      {isOnlinePayment ? (
        <>
          {matchingChannels.length === 0 ? (
            <Banner tone="warning" message="The station has no account for this yet. Please choose Cash or pay the rider." />
          ) : (
            matchingChannels.map((channel) => <PaymentChannelCard key={channel.paymentChannelId} channel={channel} isCompact />)
          )}
          <TextField
            label="Reference no. (optional)"
            value={paymentReference}
            onChangeText={setPaymentReference}
            keyboardType="number-pad"
            placeholder="If you already sent the payment"
            helperText="You can send it later from the order page, or show your receipt to the rider."
            leftIcon="receipt-outline"
          />
        </>
      ) : null}

      <SectionHeader title="Deliver to" />
      <OptionCards<DeliveryChoice>
        columns={1}
        value={deliveryChoice}
        onChange={setDeliveryChoice}
        options={[
          { value: 'savedAddress', title: 'My saved address', description: `${account.address}${account.landmark ? ` (${account.landmark})` : ''}`, icon: 'home-outline' },
          { value: 'otherAddress', title: 'Another address', description: 'Deliver somewhere else this time', icon: 'navigate-outline' },
        ]}
      />
      {deliveryChoice === 'otherAddress' ? (
        <>
          <TextField label="Delivery address" isRequired value={otherAddress} onChangeText={setOtherAddress} multiline leftIcon="location-outline" />
          <LocationPickerField
            label="Delivery spot"
            helperText="Move the map so the pin is on the delivery spot."
            value={otherLocation}
            onChange={setOtherLocation}
            initialCenter={account.latitude && account.longitude ? { latitude: account.latitude, longitude: account.longitude } : null}
          />
        </>
      ) : null}

      <TextField
        label="Notes for the rider"
        value={customerNotes}
        onChangeText={setCustomerNotes}
        placeholder="e.g. Blue gate, call when outside"
        multiline
        leftIcon="chatbubble-ellipses-outline"
      />

      <Card className="gap-1">
        <AppText variant="heading">Your order</AppText>
        <Divider />
        <KeyValueRow label={`${gallonsOrdered} ${gallonsOrdered === 1 ? 'gallon' : 'gallons'} × ${formatCurrency(pricePerGallon)}`} value={formatCurrency(totalAmount)} />
        <KeyValueRow label="Empty gallons to return" value={String(emptiesToReturn)} />
        <KeyValueRow label="Payment" value={paymentLabel} />
        <Divider />
        <KeyValueRow label="Total" value={formatCurrency(totalAmount)} isEmphasized valueColor={colors.primary} />
      </Card>
    </Screen>
  );
}
