import { type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2Icon, DownloadIcon, FileTextIcon, IdCardIcon, ReceiptIcon, ShieldCheckIcon, XCircleIcon, AlertTriangleIcon, type LucideIcon } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { clientsApi, type ClientBiometrics } from '../../api/clientsApi';
import { PassportPhoto } from '../../components/PassportPhoto';
import { formatDate } from '../../utils/format';
import { useLoad } from '../../hooks/useLoad';

/**
 * A client's onboarding documentation, read-only: only the staff member who onboarded the client
 * changes it, from the office portal.
 */

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-gray-400">{children}</p>;
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right text-gray-700">{value || '—'}</dd>
    </div>
  );
}

export function BiometricsView({ clientId, clientName }: { clientId: number; clientName: string }) {
  const { data, failed } = useLoad<ClientBiometrics>(() => clientsApi.biometrics(clientId), [clientId]);
  if (failed) return <Empty>Couldn't load the client's biometrics.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-xl border border-gray-100 p-5 sm:flex-row sm:items-center">
        <PassportPhoto clientId={clientId} name={clientName} hasPhoto={data.enrolled} className="h-32 w-28" />
        <div className="flex-1 space-y-2">
          {data.enrolled ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheckIcon size={12} /> Face enrolled
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Not enrolled</span>
          )}
          <p className="text-sm text-gray-600">
            {data.enrollment
              ? `Captured ${formatDate(data.enrollment.completedAt, true)} by ${data.enrollment.capturedByName ?? 'unknown'} · liveness ${data.enrollment.livenessConfidence?.toFixed(1) ?? '—'}%`
              : `No face on record yet. Loans need a ${data.faceMatchThreshold}% face match against it before disbursement.`}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-heading font-bold uppercase tracking-widest text-gray-400">Capture history</h3>
        {data.captures.length === 0 ? (
          <Empty>No face captures yet.</Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium text-right">Liveness</th>
                  <th className="px-4 py-3 font-medium text-right">Face match</th>
                  <th className="px-4 py-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.captures.map((capture) => (
                  <tr key={capture.id} className="align-top">
                    <td className="px-4 py-3 text-gray-700">{formatDate(capture.completedAt ?? capture.createdAt, true)}</td>
                    <td className="px-4 py-3 text-gray-700">{capture.purpose === 'enrollment' ? 'Enrollment' : `Loan #${capture.loanId}`}</td>
                    <td className="px-4 py-3">
                      {capture.status === 'passed' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2Icon size={14} /> Passed
                        </span>
                      ) : capture.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-red-600" title={capture.failureReason ?? undefined}>
                          <XCircleIcon size={14} /> Failed
                        </span>
                      ) : (
                        <span className="text-gray-400">Not finished</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{capture.livenessConfidence === null ? '—' : `${capture.livenessConfidence.toFixed(1)}%`}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{capture.similarity === null ? '—' : `${capture.similarity.toFixed(1)}%`}</td>
                    <td className="px-4 py-3 text-gray-700">{capture.capturedByName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

type Category = 'nin_slip' | 'utility_bill' | 'id_card';

interface DocumentItem {
  id: number;
  name: string | null;
  size: string | null;
  createdAt: string | null;
  category: Category | null;
  idNumber: string | null;
  label: string | null;
}

const SLOTS: { category: Category; title: string; numberLabel: string; icon: LucideIcon }[] = [
  { category: 'nin_slip', title: 'NIN slip', numberLabel: 'NIN', icon: FileTextIcon },
  { category: 'utility_bill', title: 'Utility bill', numberLabel: 'Account / meter number', icon: ReceiptIcon },
  { category: 'id_card', title: 'ID card', numberLabel: 'ID number', icon: IdCardIcon },
];

function formatSize(size: string | null): string {
  const bytes = Number(size);
  if (!Number.isFinite(bytes)) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DocumentsView({ clientId }: { clientId: number }) {
  const { data, failed } = useLoad<DocumentItem[]>(async () => (await apiClient.get<DocumentItem[]>(`/clients/${clientId}/documents`)).data, [clientId]);

  const download = async (item: DocumentItem) => {
    try {
      const response = await apiClient.get(`/clients/${clientId}/documents/${item.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name ?? 'document';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  if (failed) return <Empty>Couldn't load the client's documents.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  const older = data.filter((d) => d.category === null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const doc = data.find((d) => d.category === slot.category);
          return (
            <div key={slot.category} className={`flex flex-col rounded-xl border p-4 ${doc ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <slot.icon size={18} />
                </span>
                <h4 className="flex-1 font-heading text-sm font-bold text-gray-800">{slot.title}</h4>
                {doc && <CheckCircle2Icon size={18} className="text-emerald-600" />}
              </div>
              {doc ? (
                <dl className="mt-3 flex-1 space-y-1 text-sm">
                  {slot.category === 'id_card' && <Row label="Type" value={doc.label} />}
                  <Row label={slot.numberLabel} value={doc.idNumber} />
                  <Row label="Uploaded" value={formatDate(doc.createdAt)} />
                </dl>
              ) : (
                <p className="mt-3 flex-1 text-sm text-gray-400">Not uploaded yet.</p>
              )}
              {doc && (
                <div className="mt-4">
                  <button onClick={() => void download(doc)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <DownloadIcon size={14} /> {formatSize(doc.size) || 'Download'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {older.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-heading font-bold uppercase tracking-widest text-gray-400">Earlier uploads</h4>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {older.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2 text-gray-700">
                  <FileTextIcon size={14} className="text-gray-400" /> {item.name}
                </span>
                <button onClick={() => void download(item)} className="text-gray-400 hover:text-primary" aria-label="Download">
                  <DownloadIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface Contact {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  relationship: string | null;
  occupation: string | null;
}

const CONTACTS = {
  guarantors: { singular: 'guarantor', plural: 'guarantors', minimum: 2 },
  references: { singular: 'reference', plural: 'references', minimum: 1 },
} as const;

/** Guarantors or references — a client needs 2 guarantors and 1 reference before they can be approved. */
export function ContactsView({ clientId, kind }: { clientId: number; kind: 'guarantors' | 'references' }) {
  const config = CONTACTS[kind];
  const { data, failed } = useLoad<Contact[]>(async () => (await apiClient.get<Contact[]>(`/clients/${clientId}/${kind}`)).data, [clientId, kind]);
  if (failed) return <Empty>Couldn't load the client's {config.plural}.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;

  return (
    <div className="space-y-4">
      {data.length < config.minimum ? (
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangleIcon size={15} />
          {data.length} of the {config.minimum} {config.minimum === 1 ? config.singular : config.plural} needed before approval.
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2Icon size={15} /> Minimum of {config.minimum} met.
        </p>
      )}
      {data.length === 0 ? (
        <Empty>No {config.plural} yet.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-gray-200 p-4">
              <p className="font-heading font-semibold text-gray-800">{contact.fullName}</p>
              <p className="text-xs text-gray-500">{[contact.relationship, contact.occupation].filter(Boolean).join(' · ')}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <Row label="Phone" value={contact.phone} />
                <Row label="Email" value={contact.email} />
                <Row label="Address" value={contact.address} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface NextOfKin {
  id: number;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  email: string | null;
  notes: string | null;
}

export function NextOfKinView({ clientId }: { clientId: number }) {
  const { data, failed } = useLoad<NextOfKin[]>(async () => (await apiClient.get<NextOfKin[]>(`/clients/${clientId}/next-of-kin`)).data, [clientId]);
  if (failed) return <Empty>Couldn't load the client's next of kin.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  if (data.length === 0) return <Empty>No next of kin recorded.</Empty>;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {data.map((kin) => (
        <div key={kin.id} className="rounded-xl border border-gray-200 p-4">
          <p className="font-heading font-semibold text-gray-800">{`${kin.firstName ?? ''} ${kin.lastName ?? ''}`.trim() || '—'}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <Row label="Mobile" value={kin.mobile} />
            <Row label="Email" value={kin.email} />
            <Row label="Notes" value={kin.notes} />
          </dl>
        </div>
      ))}
    </div>
  );
}

export function NotesView({ clientId }: { clientId: number }) {
  const { data, failed } = useLoad<{ id: number; notes: string | null }[]>(async () => (await apiClient.get(`/clients/${clientId}/notes`)).data, [clientId]);
  if (failed) return <Empty>Couldn't load the client's notes.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  if (data.length === 0) return <Empty>No notes yet.</Empty>;

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
      {data.map((note) => (
        <li key={note.id} className="whitespace-pre-wrap px-4 py-3 text-sm text-gray-700">
          {note.notes || '—'}
        </li>
      ))}
    </ul>
  );
}
