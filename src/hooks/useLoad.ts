import { useEffect, useState } from 'react';

/** Loads once per key; `data` stays null until it arrives, `failed` if it couldn't. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; failed: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    load()
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, failed };
}
