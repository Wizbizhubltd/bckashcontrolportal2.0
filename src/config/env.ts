function toNumber(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const env = {
  appName: 'BCKash Control Portal',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5027/api',
  apiTimeoutMs: toNumber(import.meta.env.VITE_API_TIMEOUT_MS, 15000),
};
