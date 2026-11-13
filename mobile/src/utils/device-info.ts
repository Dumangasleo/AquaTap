import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { DeviceInfo } from '../types/api.types';

/** "Chrome on Windows" from the browser's user agent (web is used for testing). */
function describeBrowser(): string {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser';
  const system = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'Mac'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'computer';
  return `${browser} on ${system}`;
}

/** A name the user can recognize in "Devices" (e.g. "Samsung SM-A546E"). */
function describeDevice(): string {
  if (Platform.OS === 'web') return describeBrowser();

  if (Platform.OS === 'android') {
    const { Brand, Model } = Platform.constants as { Brand?: string; Model?: string };
    const brand = Brand ? Brand.charAt(0).toUpperCase() + Brand.slice(1) : '';
    const name = [brand, Model].filter(Boolean).join(' ').trim();
    return name || 'Android phone';
  }

  if (Platform.OS === 'ios') return Platform.isPad ? 'iPad' : 'iPhone';
  return 'Phone';
}

/** Sent with every sign-in so the account's device list shows where it is signed in. */
export function getDeviceInfo(): DeviceInfo {
  return {
    deviceName: describeDevice().slice(0, 120),
    platform: Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web',
    appVersion: Constants.expoConfig?.version ?? undefined,
  };
}
