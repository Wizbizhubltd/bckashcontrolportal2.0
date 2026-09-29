import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './apiClient';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../config/storageKeys';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

function unauthorized(config: InternalAxiosRequestConfig, body: unknown = {}) {
  const response = { status: 401, statusText: 'Unauthorized', data: body, headers: {}, config };
  return Promise.reject(new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response));
}

/** Accepts only requests carrying `validToken`; everything else gets a 401. */
function adapterAccepting(validToken: string): AxiosAdapter {
  return (config) =>
    config.headers.Authorization === `Bearer ${validToken}`
      ? Promise.resolve({ status: 200, statusText: 'OK', data: { ok: true }, headers: {}, config })
      : unauthorized(config);
}

describe('apiClient session refresh', () => {
  const assign = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    vi.stubGlobal('window', { location: { pathname: '/dashboard', assign } });
    localStorage.setItem(ACCESS_TOKEN_KEY, 'expired');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    assign.mockReset();
  });

  it('refreshes an expired access token once and replays every request that failed', async () => {
    apiClient.defaults.adapter = adapterAccepting('fresh');
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'fresh', refreshToken: 'refresh-2' } });

    const results = await Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('fresh');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-2');
    expect(assign).not.toHaveBeenCalled();
  });

  it('signs out when the refresh token is no longer accepted', async () => {
    apiClient.defaults.adapter = adapterAccepting('fresh');
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));

    await expect(apiClient.get('/a')).rejects.toMatchObject({ status: 401 });

    expect(assign).toHaveBeenCalledWith('/login');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
  });

  it('signs out without refreshing when the session was replaced by another device', async () => {
    apiClient.defaults.adapter = (config) => unauthorized(config, { title: 'Signed in elsewhere', reason: 'session_replaced' });
    const refresh = vi.spyOn(axios, 'post');

    await expect(apiClient.get('/a')).rejects.toMatchObject({ status: 401 });

    expect(refresh).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('/login');
  });
});
