import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3000;
export const API_PATH = '/api/v1';

/**
 * Default address of the NestJS API (testers can change it on the sign-in screen, see canChangeServerAddress).
 * 1. EXPO_PUBLIC_API_URL wins: mobile/.env locally, or the EAS environment variable in cloud builds.
 * 2. In development, reuse the IP of the computer running `expo start`, so a phone on the
 *    same Wi-Fi reaches the API at http://<computer-ip>:3000 automatically.
 * 3. Fallbacks: localhost (web / iOS simulator) and 10.0.2.2 (Android emulator).
 */
function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  if (Platform.OS === 'web') {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:${API_PORT}${API_PATH}`;
  }

  const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (developmentHost) return `http://${developmentHost}:${API_PORT}${API_PATH}`;

  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}${API_PATH}`
    : `http://localhost:${API_PORT}${API_PATH}`;
}

export const appConfig = {
  defaultApiBaseUrl: resolveApiBaseUrl(),
  /**
   * Lets testers point the app to another API address (e.g. a new `npm run tunnel` link) without a rebuild.
   * On in development and in builds with EXPO_PUBLIC_ALLOW_SERVER_CHANGE=true (preview); off in production.
   */
  canChangeServerAddress: __DEV__ || process.env.EXPO_PUBLIC_ALLOW_SERVER_CHANGE === 'true',
  /** Center of the map before we know the user's location (Cebu City). */
  defaultMapCenter: { latitude: 10.3157, longitude: 123.8854 },
  /** How often staff screens check for new orders (milliseconds). */
  orderPollingIntervalMs: 10_000,
  /** How often the rider shares location while delivering (milliseconds). */
  riderLocationIntervalMs: 15_000,
} as const;
