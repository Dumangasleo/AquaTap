import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, BottomSheet, Button, TextField, useToast } from '../../components/ui';
import { appConfig } from '../../config/app-config';
import { normalizeServerAddress } from '../../api/server-address';
import { useServerAddressStore } from '../../store/server-address-store';

interface ServerAddressSheetProps {
  onClose: () => void;
}

/** True when the address answers like the AquaTap API (GET /health). */
async function isAquaTapServer(apiBaseUrl: string): Promise<boolean> {
  try {
    const response = await axios.get<{ status?: string }>(`${apiBaseUrl}/health`, { timeout: 10_000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Testing tool: points the app to another API address, e.g. the link printed by `npm run tunnel`.
 * Render it only while open, so the form starts fresh each time.
 */
export function ServerAddressSheet({ onClose }: ServerAddressSheetProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { apiBaseUrl, isCustom, changeServerAddress, resetServerAddress } = useServerAddressStore();
  const [addressInput, setAddressInput] = useState(apiBaseUrl);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const reconnect = async (message: string) => {
    await queryClient.resetQueries();
    showToast(message, 'success');
    onClose();
  };

  const saveAddress = async () => {
    const normalizedAddress = normalizeServerAddress(addressInput);
    if (!normalizedAddress) {
      setErrorText('Enter a web address, for example https://abcd.trycloudflare.com');
      return;
    }
    setIsChecking(true);
    const isReachable = await isAquaTapServer(normalizedAddress);
    setIsChecking(false);
    if (!isReachable) {
      setErrorText('No AquaTap server answered at this address. Check that the API and the tunnel are running on the computer.');
      return;
    }
    await changeServerAddress(normalizedAddress);
    await reconnect('Connected to the server');
  };

  const switchToDefaultAddress = async () => {
    await resetServerAddress();
    await reconnect('Using the default server');
  };

  return (
    <BottomSheet
      isVisible
      title="Server address"
      subtitle="For testing: the address of the AquaTap server."
      onClose={onClose}
      footer={
        <>
          <Button
            label="Save and connect"
            icon="checkmark"
            size="lg"
            fullWidth
            isLoading={isChecking}
            isDisabled={!addressInput.trim()}
            onPress={() => void saveAddress()}
          />
          {isCustom ? (
            <Button label="Use the default address" variant="ghost" fullWidth onPress={() => void switchToDefaultAddress()} />
          ) : null}
        </>
      }
    >
      <TextField
        label="Server address"
        value={addressInput}
        onChangeText={(text) => {
          setAddressInput(text);
          setErrorText(null);
        }}
        placeholder="https://abcd.trycloudflare.com"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="link-outline"
        errorText={errorText}
        helperText="On the computer, run npm run tunnel inside the backend folder, then paste the https link it prints."
      />
      <View className="gap-1">
        <AppText variant="overline">
          Default for this app
        </AppText>
        <AppText variant="caption" className="text-ink-subtle" selectable>
          {appConfig.defaultApiBaseUrl}
        </AppText>
      </View>
    </BottomSheet>
  );
}
