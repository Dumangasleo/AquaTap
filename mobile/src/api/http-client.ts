import axios, { AxiosError } from 'axios';
import { appConfig } from '../config/app-config';
import type { ApiErrorBody } from '../types/api.types';
import { readSavedServerAddress } from './server-address';

/** Error with a message that is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let apiBaseUrl: string = readSavedServerAddress() ?? appConfig.defaultApiBaseUrl;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called when the API answers 401 (expired / invalid session) so the app can sign out. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

/** Points every API call to another server (see store/server-address-store.ts). */
export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url;
  httpClient.defaults.baseURL = url;
}

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((requestConfig) => {
  if (accessToken) requestConfig.headers.Authorization = `Bearer ${accessToken}`;
  return requestConfig;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401 && accessToken) onUnauthorized?.();
      return Promise.reject(
        new ApiError(data?.message ?? 'Something went wrong. Please try again.', status, data?.details),
      );
    }
    return Promise.reject(
      new ApiError(
        `Cannot reach the AquaTap server (${apiBaseUrl}). Check your internet connection and make sure the API is running.`,
        null,
      ),
    );
  },
);

/** Turns any thrown value into a readable message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
