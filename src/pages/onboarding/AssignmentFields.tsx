import { useEffect, useState } from 'react';
import { LoaderIcon } from 'lucide-react';
import { officesApi, type Office } from '../../api/officesApi';
import { usersApi } from '../../api/usersApi';

export interface Assignment {
  officeId: string;
  marketerId: string;
}

export const EMPTY_ASSIGNMENT: Assignment = { officeId: '', marketerId: '' };

export function assignmentProblem(assignment: Assignment): string | null {
  if (!assignment.officeId) return 'Choose the office the clients join.';
  if (!assignment.marketerId) return 'Choose the marketer who will manage them.';
  return null;
}

interface MarketerOption {
  id: number;
  name: string;
}

/** Approved, unblocked marketers working in the office. */
export async function loadMarketers(officeId: number): Promise<MarketerOption[]> {
  const page = await usersApi.list({ userType: 'marketer', officeId, onboardingStatus: 'Approved', pageSize: 100 });
  return page.items
    .filter((m) => !m.blocked)
    .map((m) => ({ id: m.id, name: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email }));
}

const selectClass = 'w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:opacity-60';

/**
 * A super admin works in no office, so every onboarding names the office the clients join and the
 * marketer there who documents and manages them from the office portal.
 */
export function AssignmentFields({ value, onChange, showProblem }: { value: Assignment; onChange: (value: Assignment) => void; showProblem: boolean }) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [marketers, setMarketers] = useState<MarketerOption[]>([]);
  const [loadingMarketers, setLoadingMarketers] = useState(false);

  useEffect(() => {
    void officesApi
      .list()
      .then((all) => setOffices(all.filter((o) => o.active)))
      .catch(() => setOffices([]));
  }, []);

  useEffect(() => {
    setMarketers([]);
    if (!value.officeId) return;
    let cancelled = false;
    setLoadingMarketers(true);
    loadMarketers(Number(value.officeId))
      .then((loaded) => !cancelled && setMarketers(loaded))
      .catch(() => !cancelled && setMarketers([]))
      .finally(() => !cancelled && setLoadingMarketers(false));
    return () => {
      cancelled = true;
    };
  }, [value.officeId]);

  const officeError = showProblem && !value.officeId;
  const marketerError = showProblem && value.officeId && !value.marketerId;

  return (
    <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
      <div>
        <h3 className="font-heading text-sm font-bold text-gray-800">Assign to an office and marketer</h3>
        <p className="mt-0.5 text-xs text-gray-500">The marketer adds the clients' documents, guarantors and face capture from the office portal, and manages them from then on.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="block text-xs font-medium text-gray-600">
            Office <span className="text-red-500">*</span>
          </span>
          <select
            value={value.officeId}
            onChange={(e) => onChange({ officeId: e.target.value, marketerId: '' })}
            className={`${selectClass} ${officeError ? 'border-red-300' : 'border-gray-200'}`}
          >
            <option value="">Select an office</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name ?? `Office #${office.id}`}
              </option>
            ))}
          </select>
          {officeError && <p className="text-xs text-red-600">Choose the office the clients join.</p>}
        </label>
        <label className="block space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            Marketer <span className="text-red-500">*</span>
            {loadingMarketers && <LoaderIcon size={12} className="animate-spin text-gray-400" />}
          </span>
          <select
            value={value.marketerId}
            disabled={!value.officeId || loadingMarketers}
            onChange={(e) => onChange({ ...value, marketerId: e.target.value })}
            className={`${selectClass} ${marketerError ? 'border-red-300' : 'border-gray-200'}`}
          >
            <option value="">{!value.officeId ? 'Choose an office first' : marketers.length === 0 && !loadingMarketers ? 'No marketers in this office' : 'Select a marketer'}</option>
            {marketers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {marketerError && <p className="text-xs text-red-600">Choose the marketer who will manage them.</p>}
        </label>
      </div>
    </section>
  );
}
