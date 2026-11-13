import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ordersApi, paymentChannelsApi } from '../api/aquatap-api';
import { getErrorMessage } from '../api/http-client';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorView,
  KeyValueRow,
  LoadingView,
  OptionCards,
  type OptionCardItem,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../components/ui';
import { PaymentChannelCard } from '../features/payments/PaymentChannelCard';
import { queryKeys } from '../hooks/query-keys';
import type { PaymentMode } from '../types/api.types';
import { formatCurrency } from '../utils/format';

type OnlinePaymentMode = Extract<PaymentMode, 'GCash' | 'BankTransfer'>;

const ONLINE_PAYMENT_OPTIONS: OptionCardItem<OnlinePaymentMode>[] = [
  { value: 'GCash', title: 'GCash', icon: 'phone-portrait-outline' },
  { value: 'BankTransfer', title: 'Bank transfer', icon: 'business-outline' },
];

/**
 * Ways to pay: the station's GCash / bank QR codes. When opened from an order, the customer can
 * also send their payment reference number so the station can confirm it.
 */
export default function PayScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const params = useLocalSearchParams<{ customerOrderId?: string }>();
  const customerOrderId = params.customerOrderId ? Number(params.customerOrderId) : null;

  const [paymentMode, setPaymentMode] = useState<OnlinePaymentMode>('GCash');
  const [paymentReference, setPaymentReference] = useState('');

  const channelsQuery = useQuery({ queryKey: queryKeys.paymentChannels, queryFn: paymentChannelsApi.list });
  const orderQuery = useQuery({
    queryKey: queryKeys.order(customerOrderId ?? 0),
    queryFn: () => ordersApi.getOrder(customerOrderId!),
    enabled: customerOrderId !== null,
  });

  const submitReference = useMutation({
    mutationFn: () => ordersApi.submitPaymentReference(customerOrderId!, selectedMode, paymentReference.trim()),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.customerOrderId), order);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('Reference sent. The station will confirm your payment.');
      router.back();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const channels = channelsQuery.data ?? [];
  const order = orderQuery.data;
  const availableModes = new Set(channels.map((channel) => channel.channelType));
  // If the station only has a bank account (no GCash), preselect what is available.
  const selectedMode: OnlinePaymentMode =
    availableModes.has(paymentMode) || channels.length === 0 ? paymentMode : channels[0].channelType;

  const sendReference = async () => {
    const isConfirmed = await confirm({
      title: 'Send your reference no.?',
      message: 'The station will check it against your payment.',
      details: [
        ...(order ? [{ label: 'Order', value: `#${order.orderNumber}` }, { label: 'Amount', value: formatCurrency(order.totalAmount) }] : []),
        { label: 'Paid with', value: selectedMode === 'BankTransfer' ? 'Bank transfer' : 'GCash' },
        { label: 'Reference no.', value: paymentReference.trim() },
      ],
      confirmLabel: 'Yes, send it',
      icon: 'receipt-outline',
    });
    if (isConfirmed) submitReference.mutate();
  };

  return (
    <Screen edges={['top', 'bottom']} header={<ScreenHeader title="Ways to pay" subtitle="GCash and bank transfer" showBackButton />}>
      {order ? (
        <Card className="gap-1">
          <KeyValueRow label="Order" value={`#${order.orderNumber}`} />
          <KeyValueRow label="Amount to pay" value={formatCurrency(order.totalAmount)} isEmphasized />
        </Card>
      ) : null}

      {channelsQuery.isLoading ? <LoadingView /> : null}
      {channelsQuery.isError ? <ErrorView error={channelsQuery.error} onRetry={() => void channelsQuery.refetch()} /> : null}
      {!channelsQuery.isLoading && channels.length === 0 ? (
        <EmptyState
          icon="qr-code-outline"
          title="No GCash or bank account yet"
          message="This station has not added one yet. You can pay the rider in cash."
        />
      ) : null}

      {channels.map((channel) => (
        <PaymentChannelCard key={channel.paymentChannelId} channel={channel} />
      ))}

      {customerOrderId && channels.length > 0 ? (
        <>
          <SectionHeader title="Already paid?" />
          <Banner tone="info" message="After you send the money, type the reference no. from your GCash or bank receipt. The station will match it to your payment." />
          <OptionCards<OnlinePaymentMode>
            label="I paid with"
            value={selectedMode}
            onChange={setPaymentMode}
            options={ONLINE_PAYMENT_OPTIONS.filter((option) => availableModes.has(option.value))}
          />
          <TextField
            label="Reference no. (from your receipt)"
            isRequired
            value={paymentReference}
            onChangeText={setPaymentReference}
            placeholder="e.g. 1009 123 456789"
            keyboardType="number-pad"
            leftIcon="receipt-outline"
          />
          <Button
            label="Send reference no."
            icon="send"
            size="lg"
            fullWidth
            isDisabled={paymentReference.trim().length < 4}
            isLoading={submitReference.isPending}
            onPress={() => void sendReference()}
          />
        </>
      ) : null}
    </Screen>
  );
}
