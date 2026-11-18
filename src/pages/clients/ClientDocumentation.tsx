import { useState, type ReactNode } from 'react';
import { CheckCircle2Icon, ScanFaceIcon, ShieldCheckIcon, XCircleIcon } from 'lucide-react';
import { clientsApi, type ClientBiometrics, type FaceCapture } from '../../api/clientsApi';
import { FaceCaptureModal } from '../../components/LazyFaceCaptureModal';
import { PassportPhoto } from '../../components/PassportPhoto';
import { PassportPhotoUploadButton } from '../../components/PassportPhotoUploadButton';
import { formatDate } from '../../utils/format';
import { useLoad } from '../../hooks/useLoad';

/**
 * The Biometrics tab of a client's documentation. A super admin can capture the client's face as the
 * staff member who onboarded them can (the API decides — see `canEnroll`). The other documentation
 * tabs are the editable sections in ./documentation.
 */

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-gray-400">{children}</p>;
}

export function BiometricsView({ clientId, clientName, onEnrolled }: { clientId: number; clientName: string; onEnrolled: () => void }) {
  const [version, setVersion] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const { data, failed } = useLoad<ClientBiometrics>(() => clientsApi.biometrics(clientId), [clientId, version]);
  if (failed) return <Empty>Couldn't load the client's biometrics.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;

  const finished = (capture: FaceCapture) => {
    setVersion((v) => v + 1);
    if (capture.status === 'passed' && capture.purpose === 'enrollment') onEnrolled();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-xl border border-gray-100 p-5 sm:flex-row sm:items-center">
        <PassportPhoto clientId={clientId} name={clientName} hasPhoto={data.hasPhoto} version={version} className="h-32 w-28" />
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
              : data.required
                ? `No face on record yet. Loans need a ${data.faceMatchThreshold}% face match against it before disbursement.`
                : `Face capture is optional. Capture the client's face with a live camera check, or upload a passport photo just for the record — it isn't a face check.`}
          </p>
          {!data.enrolled && !data.canEnroll && data.enrollBlockedReason && <p className="text-xs text-gray-400">{data.enrollBlockedReason}</p>}
        </div>
        {data.canUploadPhoto && (
          <PassportPhotoUploadButton
            clientId={clientId}
            hasPhoto={data.hasPhoto}
            onUploaded={() => {
              setVersion((v) => v + 1);
              onEnrolled();
            }}
          />
        )}
        {data.canEnroll && (
          <button
            onClick={() => setCapturing(true)}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-heading font-bold text-white hover:bg-accent/90 sm:self-center"
          >
            <ScanFaceIcon size={18} />
            {data.captures.some((c) => c.purpose === 'enrollment' && c.status === 'failed') ? 'Recapture face' : 'Begin enrollment'}
          </button>
        )}
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
      {capturing && <FaceCaptureModal clientId={clientId} clientName={clientName} purpose="enrollment" onClose={() => setCapturing(false)} onFinished={finished} />}
    </div>
  );
}
