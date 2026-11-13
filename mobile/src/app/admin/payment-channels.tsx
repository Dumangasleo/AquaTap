import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Switch, View } from 'react-native';
import { paymentChannelsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  Badge,
  Banner,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorView,
  KeyValueRow,
  LoadingView,
  OptionCards,
  Screen,
  ScreenHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import type { PaymentChannel, PaymentChannelType } from '../../types/api.types';

/** Admin: GCash / bank accounts and QR codes that customers pay to. */
export default function PaymentChannelsScreen() {
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const channelsQuery = useQuery({ queryKey: queryKeys.paymentChannels, queryFn: paymentChannelsApi.list });
  const channels = channelsQuery.data ?? [];

  const openSheet = (channel: PaymentChannel | null) => {
    setEditingChannel(channel);
    setIsSheetVisible(true);
  };

  return (
    <Screen
      header={
        <ScreenHeader
          title="GCash or bank account"
          subtitle="Where customers send their payment"
          showBackButton
          rightAction={<Button label="Add" icon="add" onPress={() => openSheet(null)} />}
        />
      }
      isRefreshing={channelsQuery.isRefetching}
      onRefresh={() => void channelsQuery.refetch()}
    >
      <Banner
        tone="info"
        icon="qr-code-outline"
        message="Upload the QR code from your GCash app (Receive, then Download QR) or your bank app. Customers scan it, pay, then send you the reference no. from their receipt."
      />

      {channelsQuery.isLoading ? (
        <LoadingView message="Loading your accounts…" />
      ) : channelsQuery.isError ? (
        <ErrorView error={channelsQuery.error} onRetry={() => void channelsQuery.refetch()} />
      ) : channels.length === 0 ? (
        <EmptyState
          icon="qr-code-outline"
          title="No GCash or bank account yet"
          message="Add your GCash or bank account so customers can pay without cash."
          actionLabel="Add an account"
          onAction={() => openSheet(null)}
        />
      ) : (
        <View className="gap-3">
          {channels.map((channel) => (
            <Card key={channel.paymentChannelId} onPress={() => openSheet(channel)} accessibilityLabel={`Edit ${channel.channelName}`} className="gap-1">
              <View className="mb-1 flex-row items-center gap-2">
                <AppText variant="heading" className="flex-1">
                  {channel.channelName}
                </AppText>
                <Badge label={channel.channelType === 'GCash' ? 'GCash' : 'Bank account'} tone="accent" />
                {!channel.isActive ? <Badge label="Hidden" tone="neutral" /> : null}
              </View>
              <KeyValueRow label="Account name" value={channel.accountName} />
              <KeyValueRow label="Account number" value={channel.accountNumber} />
              {channel.qrImage ? (
                <Image source={{ uri: channel.qrImage }} className="mt-2 h-[220px] w-full rounded-field bg-surface-muted" resizeMode="contain" accessibilityLabel={`${channel.channelName} QR code`} />
              ) : (
                <AppText variant="caption" className="text-warning">
                  No QR code yet. Tap to add one.
                </AppText>
              )}
            </Card>
          ))}
        </View>
      )}

      <PaymentChannelSheet isVisible={isSheetVisible} channel={editingChannel} onClose={() => setIsSheetVisible(false)} />
    </Screen>
  );
}

interface PaymentChannelSheetProps {
  isVisible: boolean;
  channel: PaymentChannel | null;
  onClose: () => void;
}

function PaymentChannelSheet({ isVisible, channel, onClose }: PaymentChannelSheetProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [channelType, setChannelType] = useState<PaymentChannelType>('GCash');
  const [channelName, setChannelName] = useState('GCash');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isVisible) return;
    setChannelType(channel?.channelType ?? 'GCash');
    setChannelName(channel?.channelName ?? 'GCash');
    setAccountName(channel?.accountName ?? '');
    setAccountNumber(channel?.accountNumber ?? '');
    setQrImage(channel?.qrImage ?? null);
    setIsActive(channel?.isActive ?? true);
  }, [isVisible, channel]);

  const isFormValid = channelName.trim().length >= 2 && accountName.trim().length >= 2 && accountNumber.trim().length >= 4;

  const saveMutation = useMutation({
    mutationFn: () => {
      const request = {
        channelName: channelName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        qrImage: qrImage ?? (channel ? '' : undefined),
      };
      return channel
        ? paymentChannelsApi.update(channel.paymentChannelId, { ...request, isActive })
        : paymentChannelsApi.create({ ...request, channelType });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paymentChannels });
      showToast(channel ? 'Account updated.' : 'Account added.');
      onClose();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const pickQrImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    setQrImage(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  };

  const handleTypeChange = (type: PaymentChannelType) => {
    setChannelType(type);
    if (type === 'GCash') setChannelName('GCash');
    else if (channelName === 'GCash') setChannelName('');
  };

  const handleSave = async () => {
    const isConfirmed = await confirm({
      title: channel ? 'Save changes to this account?' : 'Add this account?',
      message: 'Customers will see these details when they pay you.',
      details: [
        { label: 'Type', value: channelType === 'GCash' ? 'GCash' : 'Bank account' },
        { label: channelType === 'GCash' ? 'Name' : 'Bank', value: channelName.trim() },
        { label: 'Account name', value: accountName.trim() },
        { label: 'Number', value: accountNumber.trim() },
        { label: 'QR code', value: qrImage ? 'Uploaded' : 'None' },
        { label: 'Shown to customers', value: isActive ? 'Yes' : 'No' },
      ],
      confirmLabel: channel ? 'Yes, save' : 'Yes, add account',
      icon: 'wallet',
    });
    if (isConfirmed) saveMutation.mutate();
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      title={channel ? 'Edit account' : 'Add GCash or bank account'}
      onClose={onClose}
      footer={
        <Button label="Save" icon="checkmark" size="lg" fullWidth isDisabled={!isFormValid} isLoading={saveMutation.isPending} onPress={() => void handleSave()} />
      }
    >
      {!channel ? (
        <OptionCards<PaymentChannelType>
          label="Type"
          value={channelType}
          onChange={handleTypeChange}
          options={[
            { value: 'GCash', title: 'GCash', icon: 'phone-portrait-outline' },
            { value: 'BankTransfer', title: 'Bank account', icon: 'business-outline' },
          ]}
        />
      ) : null}
      <TextField
        label={channelType === 'GCash' ? 'Name shown to customers' : 'Bank name'}
        isRequired
        placeholder={channelType === 'GCash' ? 'GCash' : 'e.g. BDO, BPI, Landbank'}
        value={channelName}
        onChangeText={setChannelName}
      />
      <TextField label="Account name" isRequired placeholder="e.g. LEO I. DUMANGAS" value={accountName} onChangeText={setAccountName} autoCapitalize="characters" />
      <TextField
        label={channelType === 'GCash' ? 'GCash number' : 'Account number'}
        isRequired
        placeholder={channelType === 'GCash' ? '09XX XXX XXXX' : '0000 0000 0000'}
        value={accountNumber}
        onChangeText={setAccountNumber}
        keyboardType="number-pad"
      />

      <View className="gap-2">
        <AppText variant="overline">QR code</AppText>
        {qrImage ? <Image source={{ uri: qrImage }} className="h-[220px] w-full rounded-field bg-surface-muted" resizeMode="contain" accessibilityLabel="QR code preview" /> : null}
        <View className="flex-row items-center gap-2">
          <Button label={qrImage ? 'Change QR image' : 'Upload QR image'} icon="image-outline" variant="secondary" className="flex-1" onPress={() => void pickQrImage()} />
          {qrImage ? <Button label="Remove" icon="trash-outline" variant="ghost" onPress={() => setQrImage(null)} /> : null}
        </View>
      </View>

      {channel ? (
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <AppText variant="bodyStrong">Show to customers</AppText>
            <AppText variant="caption" className="text-ink-muted">
              Turn off to hide this account without deleting it.
            </AppText>
          </View>
          <Switch accessibilityLabel="Show to customers" value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.success, false: colors.borderStrong }} />
        </View>
      ) : null}
    </BottomSheet>
  );
}
