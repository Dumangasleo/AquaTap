import { API_PATH, appConfig } from '../config/app-config';
import { secureStorage } from '../utils/secure-storage';

const SERVER_ADDRESS_STORAGE_KEY = 'aquatap.serverAddress';
const ADDRESS_PATTERN = /^https?:\/\/[a-z0-9.-]+(:\d+)?(\/\S*)?$/i;

/**
 * Accepts what testers usually paste: "abcd.trycloudflare.com", "https://abcd.trycloudflare.com/"
 * or the full ".../api/v1" link. Returns the API base URL, or null when it is not a web address.
 */
export function normalizeServerAddress(input: string): string | null {
  let address = input.trim().replace(/\/+$/, '');
  if (!address) return null;
  if (!/^https?:\/\//i.test(address)) address = `https://${address}`;
  if (!ADDRESS_PATTERN.test(address)) return null;
  return address.toLowerCase().endsWith(API_PATH) ? address : `${address}${API_PATH}`;
}

/**
 * The address a tester saved on the sign-in screen, read synchronously so the very first API call
 * already uses it. Always null in builds where changing the server is not allowed.
 */
export function readSavedServerAddress(): string | null {
  if (!appConfig.canChangeServerAddress) return null;
  try {
    return secureStorage.getItemSync(SERVER_ADDRESS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveServerAddress(apiBaseUrl: string): Promise<void> {
  return secureStorage.setItem(SERVER_ADDRESS_STORAGE_KEY, apiBaseUrl);
}

export function clearSavedServerAddress(): Promise<void> {
  return secureStorage.removeItem(SERVER_ADDRESS_STORAGE_KEY);
}
