import { create } from 'zustand';
import { authApi } from '../api/aquatap-api';
import { setAccessToken, setUnauthorizedHandler } from '../api/http-client';
import type { AuthSession, Profile } from '../types/api.types';
import { secureStorage } from '../utils/secure-storage';

const ACCESS_TOKEN_STORAGE_KEY = 'aquatap.accessToken';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  profile: Profile | null;
  /** Restores the saved session when the app starts. */
  restoreSession: () => Promise<void>;
  startSession: (session: AuthSession) => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  /** Replaces the profile after a change (new photo, password, two-step sign-in...). */
  setProfile: (profile: Profile) => void;
  /** Signs out on this device and tells the server to end this sign-in. */
  signOut: () => Promise<void>;
  /** Clears the session on this device only (used when the server already ended it). */
  clearSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  profile: null,

  restoreSession: async () => {
    const savedToken = await secureStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!savedToken) {
      set({ status: 'signedOut', profile: null });
      return;
    }
    setAccessToken(savedToken);
    try {
      const profile = await authApi.getProfile();
      set({ status: 'signedIn', profile });
    } catch {
      await get().clearSession();
    }
  },

  startSession: async (session) => {
    setAccessToken(session.accessToken);
    await secureStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
    set({ status: 'signedIn', profile: session.profile });
  },

  refreshProfile: async () => {
    try {
      const profile = await authApi.getProfile();
      set({ profile });
      return profile;
    } catch {
      return get().profile;
    }
  },

  setProfile: (profile) => set({ profile }),

  signOut: async () => {
    try {
      await authApi.signOut();
    } catch {
      // Offline or already signed out on the server: still sign out on this device.
    }
    await get().clearSession();
  },

  clearSession: async () => {
    setAccessToken(null);
    await secureStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    set({ status: 'signedOut', profile: null });
  },
}));

// A session that ended (expired, or signed out from another device) sends the user back to the sign-in screen.
setUnauthorizedHandler(() => {
  void useAuthStore.getState().clearSession();
});

export const isStaffRole = (profile: Profile | null) =>
  profile?.role === 'Admin' || profile?.role === 'Employee';
