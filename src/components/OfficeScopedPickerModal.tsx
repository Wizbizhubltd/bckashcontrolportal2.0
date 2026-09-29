import { useEffect, useState } from 'react';
import { LoaderIcon, XIcon } from 'lucide-react';
import type { Office } from '../api/officesApi';

export interface PickerOption {
  label: string;
  value: string;
}

/**
 * Pick an office, then something in it (a group, a marketer…). Starts on <paramref name="defaultOfficeId"/>
 * — the office the selected records share, when they all share one.
 */
export function OfficeScopedPickerModal({
  title,
  description,
  pickLabel,
  confirmLabel,
  offices,
  defaultOfficeId,
  loadOptions,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  pickLabel: string;
  confirmLabel: string;
  offices: Office[];
  defaultOfficeId: number | null;
  /** What can be picked in an office; "none found" is shown when it returns nothing. */
  loadOptions: (officeId: number) => Promise<PickerOption[]>;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [officeId, setOfficeId] = useState(defaultOfficeId ? String(defaultOfficeId) : '');
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
    setOptions([]);
    if (!officeId) return;
    let cancelled = false;
    setLoading(true);
    loadOptions(Number(officeId))
      .then((loaded) => !cancelled && setOptions(loaded))
      .catch(() => !cancelled && setOptions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId]);

  const selectClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white disabled:opacity-60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <XIcon size={18} />
        </button>
        <h3 className="text-lg font-heading font-bold text-gray-900">{title}</h3>
        <p className="text-sm font-body text-gray-500 mt-1 mb-4">{description}</p>

        <label className="block text-xs font-body font-medium text-gray-600 mb-1.5">Office</label>
        <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className={`${selectClass} mb-4`}>
          <option value="">Select an office…</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name ?? `Office #${o.id}`}
            </option>
          ))}
        </select>

        <label className="block text-xs font-body font-medium text-gray-600 mb-1.5">{pickLabel}</label>
        <div className="relative">
          <select value={value} onChange={(e) => setValue(e.target.value)} disabled={!officeId || loading || options.length === 0} className={selectClass}>
            <option value="">{!officeId ? 'Pick an office first' : loading ? 'Loading…' : options.length === 0 ? 'None in this office' : 'Select…'}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {loading && <LoaderIcon size={14} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => value && onConfirm(value)}
            disabled={!value}
            className="px-4 py-2 text-sm font-heading font-bold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
