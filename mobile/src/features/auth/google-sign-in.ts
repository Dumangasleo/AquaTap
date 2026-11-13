import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

export type GoogleSignInResult =
  | { status: 'success'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string };

/**
 * Google Sign-In needs native code, so it only works in a development / release build
 * (`npx expo run:android` or EAS Build). In Expo Go and on web we report it as unavailable
 * instead of crashing, and the developer sign-in can be used for testing.
 */
function loadGoogleSignInModule(): GoogleSignInModule | null {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    return null;
  }
}

let isConfigured = false;

export function getGoogleSignInAvailability(webClientId: string | null | undefined): { isAvailable: boolean; reason?: string } {
  if (!webClientId) return { isAvailable: false, reason: 'Google sign-in is not configured yet (missing Web client ID).' };
  if (Platform.OS === 'web') return { isAvailable: false, reason: 'Google sign-in works in the Android / iOS app.' };
  if (isRunningInExpoGo()) return { isAvailable: false, reason: 'Google sign-in needs the AquaTap development build (not Expo Go).' };
  return { isAvailable: true };
}

export async function signInWithGoogle(webClientId: string): Promise<GoogleSignInResult> {
  const googleSignIn = loadGoogleSignInModule();
  if (!googleSignIn) return { status: 'unavailable', reason: 'Google sign-in is not available in this build.' };

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = googleSignIn;
  if (!isConfigured) {
    GoogleSignin.configure({ webClientId });
    isConfigured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { status: 'cancelled' };
    if (!response.data.idToken) {
      return { status: 'unavailable', reason: 'Google did not return an ID token. Check the Web client ID.' };
    }
    return { status: 'success', idToken: response.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) return { status: 'cancelled' };
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'unavailable', reason: 'Google Play Services is not available on this phone.' };
      }
    }
    throw error;
  }
}

export async function signOutFromGoogle(): Promise<void> {
  const googleSignIn = loadGoogleSignInModule();
  if (!googleSignIn || !isConfigured) return;
  await googleSignIn.GoogleSignin.signOut().catch(() => undefined);
}
