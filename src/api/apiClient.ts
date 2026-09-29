import axios, { type InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SIGNED_OUT_REASON_KEY, USER_DATA_KEY } from '../config/storageKeys';

const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiError extends Error {
  status?: number;
  responseData?: unknown;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Refresh tokens are single-use (the API rotates them), so every request that hits a 401 at the
// same time waits on this one refresh instead of each spending the token and all but one failing.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    // Plain axios, not apiClient: a 401 from the refresh call itself must not re-enter this interceptor.
    const response = await axios.post<RefreshResponse>('/auth/refresh', { refreshToken }, { baseURL: env.apiBaseUrl, timeout: env.apiTimeoutMs });
    localStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
    return response.data.accessToken;
  } catch {
    // Another tab may have spent the same refresh token a moment earlier — if it stored a new
    // access token, use that rather than signing this tab out.
    const current = localStorage.getItem(ACCESS_TOKEN_KEY);
    return current && localStorage.getItem(REFRESH_TOKEN_KEY) !== refreshToken ? current : null;
  }
}

function signOut(reasonMessage?: string) {
  if (reasonMessage) sessionStorage.setItem(SIGNED_OUT_REASON_KEY, reasonMessage);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  window.location.assign('/login');
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const title = axios.isAxiosError(error) ? (error.response?.data as { title?: string } | undefined)?.title : undefined;
    const normalized: ApiError = new Error(title || (error instanceof Error ? error.message : 'Request failed'));
    if (axios.isAxiosError(error)) {
      normalized.status = error.response?.status;
      normalized.responseData = error.response?.data;
    }

    // A 401 here means the access token expired mid-use (login/OTP attempts go through authApi's
    // own axios instance and never hit this interceptor). Access tokens are short-lived, so swap in
    // a fresh one with the refresh token and replay the request — the operator only goes back to
    // the login screen once the session itself is over.
    if (normalized.status === 401 && window.location.pathname !== '/login') {
      // Only one device can be signed in at a time — tell the user why they were signed out.
      const reason = (normalized.responseData as { reason?: string } | undefined)?.reason;
      if (reason === 'session_replaced') {
        signOut(normalized.message);
        return Promise.reject(normalized);
      }

      const config = axios.isAxiosError(error) ? (error.config as RetriableConfig | undefined) : undefined;
      if (config && !config._retried) {
        refreshInFlight ??= refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
        const token = await refreshInFlight;
        if (token) {
          config._retried = true;
          config.headers.Authorization = `Bearer ${token}`;
          return apiClient(config);
        }
      }

      signOut();
    }

    return Promise.reject(normalized);
  },
);

export default apiClient;
