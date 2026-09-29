import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircleIcon, LandmarkIcon, LoaderIcon, XCircleIcon } from 'lucide-react';
import { loanApplicationsApi, type ApplicationCollateral, type ApplicationGuarantor, type LoanApplicationDetail } from '../../api/loanApplicationsApi';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useLoad } from '../../hooks/useLoad';
import { formatMoney } from '../../utils/money';
import { disbursementModeLabel, payInto } from '../../utils/disbursement';

type SectionKey = 'profile' | 'guarantors' | 'collateral';

const SECTIONS: SectionKey[] = ['profile', 'guarantors', 'collateral'];

/**
 * A loan application's page, laid out as in the office portal: the applicant and request, then its
 * profile, guarantors and collateral. A super admin can approve a pending application (creating the
 * loan, pending disbursement) or decline it; once approved it links to the loan it created.
 */
export function LoanApplicationDetailPage() {
  const applicationId = Number(useParams<{ id: string }>().id);
  const [section, setSection] = useState<SectionKey>('profile');
  const [application, setApplication] = useState<LoanApplicationDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showDecline, setShowDecline] = useState(false);

  const load = async () => {
    try {
      setApplication(await loanApplicationsApi.get(applicationId));
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const decline = async (reason: string | undefined) => {
    setShowDecline(false);
    try {
      await loanApplicationsApi.decline(applicationId, reason?.trim() ?? '');
      toast.success('Application declined.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Decline failed.');
    }
  };

  if (failed) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">This application doesn't exist or was deleted.</p>
        <Link to="/loan-applications" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to loan applications
        </Link>
      </div>
    );
  }

  if (!application) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading…</p>;
  }

  const isGroup = application.clientType === 'Group';
  const applicantLink = isGroup ? (application.groupId ? `/groups/${application.groupId}` : null) : application.clientId ? `/clients/${application.clientId}` : null;
  const applicant = application.applicantName ?? (isGroup ? `Group #${application.groupId}` : `Client #${application.clientId}`);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold text-primary">Application #{application.id}</h1>
            <StatusBadge status={application.status as StatusType} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {applicantLink ? (
              <Link to={applicantLink} className="font-medium text-primary hover:underline">
                {applicant}
              </Link>
            ) : (
              applicant
            )}{' '}
            · {application.clientType} loan · Requested {formatMoney(application.amount)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {application.status === 'Pending' && (
            <>
              <button onClick={() => setShowApprove(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
                <CheckCircleIcon size={16} />
                Approve
              </button>
              <button onClick={() => setShowDecline(true)} className="flex items-center gap-2 border border-gray-200 text-red-600 hover:bg-red-50 text-sm font-medium px-3 py-2 rounded-lg">
                <XCircleIcon size={16} />
                Decline
              </button>
            </>
          )}
          {application.loanId && (
            <Link to={`/loans/${application.loanId}`} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-3 py-2 rounded-lg">
              <LandmarkIcon size={16} />
              View loan
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-4 py-2 text-sm font-heading font-medium border-b-2 -mb-px transition-colors capitalize ${
              section === s ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProfileField label="Loan product" value={application.loanProductName ?? `Product #${application.loanProductId}`} />
          <ProfileField label="Amount requested" value={formatMoney(application.amount)} />
          <ProfileField label="Office" value={application.officeName} />
          <ProfileField label="Term" value={application.loanTerm ? `${application.loanTerm} ${application.loanTermType ?? ''}` : null} />
          <ProfileField label="Disbursement Method" value={disbursementModeLabel(application.disbursementMode)} />
          {payInto(application) && <ProfileField label="Pay Into" value={payInto(application)} />}
          <ProfileField label="Notes" value={application.notes} />
          {application.status === 'Approved' && <ProfileField label="Approved Notes" value={application.approvedNotes} />}
          {application.status === 'Declined' && <ProfileField label="Declined Reason" value={application.declinedNotes} />}
        </div>
      )}

      {section === 'guarantors' && <Guarantors applicationId={applicationId} />}
      {section === 'collateral' && <Collateral applicationId={applicationId} />}

      {showApprove && (
        <ApproveModal
          application={application}
          onClose={() => setShowApprove(false)}
          onApproved={() => {
            setShowApprove(false);
            void load();
          }}
        />
      )}

      <ConfirmationModal
        isOpen={showDecline}
        onClose={() => setShowDecline(false)}
        onConfirm={(reason) => void decline(reason)}
        title="Decline application"
        description="Declining is final — the client must make a new application to reapply. Give the reason for the record."
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel="Decline"
        confirmVariant="danger"
      />
    </div>
  );
}

function ApproveModal({ application, onClose, onApproved }: { application: LoanApplicationDetail; onClose: () => void; onApproved: () => void }) {
  const [amount, setAmount] = useState(application.amount.toString());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = Number(amount);
  const invalid = !amount.trim() || !Number.isFinite(parsed) || parsed <= 0;

  const approve = async () => {
    setSaving(true);
    try {
      await loanApplicationsApi.approve(application.id, parsed, notes.trim() || null);
      toast.success('Application approved — a loan was created, pending disbursement.');
      onApproved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Approval failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-heading font-bold text-primary mb-2">Approve Application</h2>
        <p className="text-xs text-gray-500 mb-4">Creates the loan for {application.applicantName ?? 'the applicant'}, ready for disbursement once their face match passes.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">Requested: {formatMoney(application.amount)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => void approve()}
            disabled={saving || invalid}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving && <LoaderIcon size={14} className="animate-spin" />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}

function Guarantors({ applicationId }: { applicationId: number }) {
  const { data, failed } = useLoad<ApplicationGuarantor[]>(() => loanApplicationsApi.guarantors(applicationId), [applicationId]);

  return (
    <Table headers={['Name', 'Mobile', 'Existing client', 'Guaranteed amount']} colSpan={4} failed={failed} loading={!data} empty={data?.length === 0} emptyText="No guarantors on this application.">
      {data?.map((g) => (
        <tr key={g.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-gray-700">{`${g.firstName ?? ''} ${g.lastName ?? ''}`.trim() || '—'}</td>
          <td className="px-4 py-3 text-gray-700">{g.mobile || '—'}</td>
          <td className="px-4 py-3 text-gray-700">{g.isClient ? 'Yes' : 'No'}</td>
          <td className="px-4 py-3 text-gray-700">{formatMoney(g.amount)}</td>
        </tr>
      ))}
    </Table>
  );
}

function Collateral({ applicationId }: { applicationId: number }) {
  const { data, failed } = useLoad<ApplicationCollateral[]>(() => loanApplicationsApi.collateral(applicationId), [applicationId]);

  return (
    <Table headers={['Name', 'Serial No.', 'Estimated value', 'Description']} colSpan={4} failed={failed} loading={!data} empty={data?.length === 0} emptyText="No collateral on this application.">
      {data?.map((c) => (
        <tr key={c.id} className="hover:bg-gray-50">
          <td className="px-4 py-3 text-gray-700">{c.name || '—'}</td>
          <td className="px-4 py-3 text-gray-700">{c.serial || '—'}</td>
          <td className="px-4 py-3 text-gray-700">{formatMoney(c.value)}</td>
          <td className="px-4 py-3 text-gray-700">{c.description || '—'}</td>
        </tr>
      ))}
    </Table>
  );
}

function Table({
  headers,
  colSpan,
  failed,
  loading,
  empty,
  emptyText,
  children,
}: {
  headers: string[];
  colSpan: number;
  failed: boolean;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  const message = failed ? "Couldn't load this section." : loading ? 'Loading…' : empty ? emptyText : null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {message ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-400">
                {message}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
