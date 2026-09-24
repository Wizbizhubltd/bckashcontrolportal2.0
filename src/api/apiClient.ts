import axios from 'axios';
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const title = axios.isAxiosError(error) ? (error.response?.data as { title?: string } | undefined)?.title : undefined;
    const normalized: ApiError = new Error(title || (error instanceof Error ? error.message : 'Request failed'));
    if (axios.isAxiosError(error)) {
      normalized.status = error.response?.status;
      normalized.responseData = error.response?.data;
    }

    // A 401 here means the session's access token is gone/expired mid-use (as opposed to a
    // login/OTP-verify attempt, which goes through authApi's own unauthenticated axios instance
    // and never hits this interceptor) — bounce straight back to the login screen instead of
    // leaving the operator staring at a page full of failed-request toasts.
    if (normalized.status === 401 && window.location.pathname !== '/login') {
      // Only one device can be signed in at a time — tell the user why they were signed out.
      const reason = (normalized.responseData as { reason?: string } | undefined)?.reason;
      if (reason === 'session_replaced') {
        sessionStorage.setItem(SIGNED_OUT_REASON_KEY, normalized.message);
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      window.location.assign('/login');
    }

    return Promise.reject(normalized);
  },
);

export default apiClient;
