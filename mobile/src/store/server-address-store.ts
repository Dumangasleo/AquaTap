import { create } from 'zustand';
import { getApiBaseUrl, setApiBaseUrl } from '../api/http-client';
import { clearSavedServerAddress, saveServerAddress } from '../api/server-address';
import { appConfig } from '../config/app-config';

interface ServerAddressState {
  /** The API address every request uses right now. */
  apiBaseUrl: string;
  /** True when a tester saved an address different from the build's default. */
  isCustom: boolean;
  changeServerAddress: (apiBaseUrl: string) => Promise<void>;
  resetServerAddress: () => Promise<void>;
}

const isCustomAddress = (apiBaseUrl: string) => apiBaseUrl !== appConfig.defaultApiBaseUrl;

/** Lets screens show and change the API address (the saved value is already applied by http-client). */
export const useServerAddressStore = create<ServerAddressState>((set) => ({
  apiBaseUrl: getApiBaseUrl(),
  isCustom: isCustomAddress(getApiBaseUrl()),

  changeServerAddress: async (apiBaseUrl) => {
    setApiBaseUrl(apiBaseUrl);
    await saveServerAddress(apiBaseUrl);
    set({ apiBaseUrl, isCustom: isCustomAddress(apiBaseUrl) });
  },

  resetServerAddress: async () => {
    setApiBaseUrl(appConfig.defaultApiBaseUrl);
    await clearSavedServerAddress();
    set({ apiBaseUrl: appConfig.defaultApiBaseUrl, isCustom: false });
  },
}));
