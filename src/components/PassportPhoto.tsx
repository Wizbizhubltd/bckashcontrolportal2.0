import { useEffect, useState } from 'react';
import { clientsApi } from '../api/clientsApi';
import { initials } from '../utils/format';

/** A client's passport photograph (their enrolled face capture, or a photo uploaded while face capture is off), or an initials avatar when there's none. Bump `version` to reload it after a new one is saved. */
export function PassportPhoto({
  clientId,
  name,
  hasPhoto,
  version = 0,
  className = 'h-28 w-24',
}: {
  clientId: number;
  name: string;
  hasPhoto: boolean;
  version?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    void clientsApi.photoUrl(clientId).then((loaded) => {
      objectUrl = loaded;
      if (!cancelled) setUrl(loaded);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [clientId, hasPhoto, version]);

  if (url) {
    return <img src={url} alt={`Passport photograph of ${name}`} className={`${className} flex-shrink-0 rounded-xl border border-gray-200 object-cover`} />;
  }

  return (
    <div
      className={`${className} flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 font-heading text-2xl font-bold text-primary ring-1 ring-primary/10`}
      aria-label={`${name} — no passport photograph yet`}
    >
      {initials(name) || '?'}
    </div>
  );
}
