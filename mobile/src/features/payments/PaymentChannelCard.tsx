import * as Clipboard from 'expo-clipboard';
import { Image, View } from 'react-native';
import { AppText, Badge, Button, Card, useToast } from '../../components/ui';
import type { PaymentChannel } from '../../types/api.types';

/** One GCash / bank account of the station, with its QR code and a copy button. */
export function PaymentChannelCard({ channel, isCompact = false }: { channel: PaymentChannel; isCompact?: boolean }) {
  const { showToast } = useToast();

  const copyAccountNumber = async () => {
    await Clipboard.setStringAsync(channel.accountNumber);
    showToast(`${channel.channelName} number copied`);
  };

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-2">
        <AppText variant="heading" className="flex-1">
          {channel.channelName}
        </AppText>
        <Badge label={channel.channelType === 'GCash' ? 'GCash' : 'Bank transfer'} tone={channel.channelType === 'GCash' ? 'info' : 'accent'} />
      </View>

      {channel.qrImage ? (
        <View className="items-center gap-2 rounded-field border border-line bg-surface p-3">
          <Image
            source={{ uri: channel.qrImage }}
            style={{ width: isCompact ? 180 : 240, height: isCompact ? 180 : 240 }}
            resizeMode="contain"
            accessibilityLabel={`${channel.channelName} QR code`}
          />
          <AppText variant="caption" className="text-center text-ink-muted">
            Scan with your {channel.channelType === 'GCash' ? 'GCash' : 'banking'} app
          </AppText>
        </View>
      ) : null}

      <View className="flex-row items-center gap-3 rounded-field bg-surface-muted p-4">
        <View className="flex-1 gap-0.5">
          <AppText variant="overline">Account name</AppText>
          <AppText variant="bodyStrong">{channel.accountName}</AppText>
          <AppText variant="overline" className="mt-2">
            Account number
          </AppText>
          <AppText variant="heading" selectable>
            {channel.accountNumber}
          </AppText>
        </View>
        <Button label="Copy" icon="copy-outline" variant="secondary" size="sm" onPress={() => void copyAccountNumber()} />
      </View>
    </Card>
  );
}
