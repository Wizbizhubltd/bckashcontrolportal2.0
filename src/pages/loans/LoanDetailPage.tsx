import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BanknoteIcon, CheckCircle2Icon, LoaderIcon, ScanFaceIcon, ShieldAlertIcon } from 'lucide-react';
import { loansApi, type LoanCharge, type LoanDetail, type LoanFaceCheck, type LoanTransaction, type RescheduleRequest, type ScheduleInstallment } from '../../api/loansApi';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';
import { useLoad } from '../../hooks/useLoad';
import { formatMoney } from '../../utils/money';
import { formatDate, humanize } from '../../utils/format';
import { disbursementModeLabel, payInto } from '../../utils/disbursement';
import { FaceCaptureModal } from '../../components/FaceCaptureModal';
import { LoanSummaryCards } from './LoanSummaryCards';

type SectionKey = 'profile' | 'schedule' | 'repayments' | 'charges';

const SECTIONS: SectionKey[] = ['profile', 'schedule', 'repayments', 'charges'];

/**
 * A loan's page, laid out as in the office portal: status, the applicant, the face match needed
 * before disbursement, then the loan's profile, repayment schedule, transactions and charges. A super
 * admin can run that face match when Settings → Loan allows their role, and disburse a pending loan once
 * every client receiving money has passed it; everything else is read-only here.
 */
export function LoanDetailPage() {
  const loanId = Number(useParams<{ id: string }>().id);

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [section, setSection] = useState<SectionKey>('profile');
  const [refreshToken, setRefreshToken] = useState(0);
  const [faceChecks, setFaceChecks] = useState<LoanFaceCheck[] | null>(null);
  const [showDisburse, setShowDisburse] = useState(false);

  const load = async () => {
    try {
      const loaded = await loansApi.get(loanId);
      setLoan(loaded);
      setFaceChecks(loaded.status === 'Pending' ? await loansApi.faceChecks(loanId).catch(() => []) : null);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  if (notFound) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">This loan doesn't exist or was deleted.</p>
        <Link to="/loans" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to loans
        </Link>
      </div>
    );
  }

  if (!loan) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading…</p>;
  }

  const allFacesVerified = faceChecks !== null && faceChecks.every((c) => c.verified);
  const canDisburse = loan.status === 'Pending' && allFacesVerified;
  const applicantLink = loan.clientId ? `/clients/${loan.clientId}` : loan.groupId ? `/groups/${loan.groupId}` : null;
  const applicant = loan.applicantName ?? (loan.clientId ? `Client #${loan.clientId}` : `Group #${loan.groupId}`);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-heading font-bold text-primary">Loan {loan.accountNumber ?? `#${loan.id}`}</h1>
            <StatusBadge status={loan.status as StatusType} />
            {loan.isNpa && (
              <span className="px-2.5 py-1 rounded-full text-xs font-heading font-medium border bg-red-100 text-red-700 border-red-200">
                NPA{loan.incomeSuspended ? ' · Income Suspended' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {applicantLink ? (
              <Link to={applicantLink} className="font-medium text-primary hover:underline">
                {applicant}
              </Link>
            ) : (
              applicant
            )}{' '}
            · {loan.loanProductName ?? `${loan.clientType} loan`} · {loan.officeName ?? 'No office'} · Approved {formatMoney(loan.approvedAmount)}
          </p>
        </div>

        {loan.status === 'Pending' && (
          <button
            onClick={() => setShowDisburse(true)}
            disabled={!canDisburse}
            title={canDisburse ? undefined : 'Every client receiving money must pass their face match first.'}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BanknoteIcon size={16} />
            Disburse
          </button>
        )}
      </div>

      <LoanSummaryCards loanId={loanId} refreshToken={refreshToken} />

      {loan.status === 'Pending' && faceChecks && faceChecks.length > 0 && (
        <FaceChecks checks={faceChecks} loanId={loanId} onChanged={() => void loansApi.faceChecks(loanId).then(setFaceChecks).catch(() => undefined)} />
      )}

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
          <ProfileField label="Applied Amount" value={loan.appliedAmount != null ? formatMoney(loan.appliedAmount) : null} />
          <ProfileField label="Approved Amount" value={loan.approvedAmount != null ? formatMoney(loan.approvedAmount) : null} />
          <ProfileField label="Disbursed Principal" value={loan.principal != null ? formatMoney(loan.principal) : null} />
          <ProfileField label="Interest Rate" value={loan.interestRate ? `${loan.interestRate}%` : null} />
          <ProfileField label="Term" value={loan.loanTerm ? `${loan.loanTerm} ${loan.loanTermType ?? ''}` : null} />
          <ProfileField label="Disbursement Date" value={loan.disbursementDate ? formatDate(loan.disbursementDate) : null} />
          <ProfileField label="Approval Notes" value={loan.approvedNotes} />
          <ProfileField label="Disbursement Notes" value={loan.disbursedNotes} />
          <ProfileField label="Disbursement Method" value={disbursementModeLabel(loan.disbursementMode)} />
          {payInto(loan) && <ProfileField label="Pay Into" value={payInto(loan)} />}
          {loan.status === 'WrittenOff' && <ProfileField label="Written-Off Date" value={formatDate(loan.writtenOffDate)} />}
          {loan.status === 'WrittenOff' && <ProfileField label="Written-Off Reason" value={loan.writtenOffNotes} />}
          <ProfileField label="Notes" value={loan.notes} />
        </div>
      )}

      {section === 'schedule' && (
        <div className="space-y-6">
          <Schedule loanId={loanId} refreshToken={refreshToken} />
          <RescheduleRequests loanId={loanId} refreshToken={refreshToken} />
        </div>
      )}

      {section === 'repayments' && <Repayments loanId={loanId} refreshToken={refreshToken} />}

      {section === 'charges' && <Charges loanId={loanId} />}

      {showDisburse && (
        <DisburseModal
          loan={loan}
          onClose={() => setShowDisburse(false)}
          onDisbursed={() => {
            setShowDisburse(false);
            setRefreshToken((t) => t + 1);
            void load();
          }}
        />
      )}
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

/**
 * Who must pass a face match before the loan can be disbursed, and who has. Roles ticked in
 * Settings → Loan can run a capture from here; otherwise it's done in the office portal.
 */
function FaceChecks({ checks, loanId, onChanged }: { checks: LoanFaceCheck[]; loanId: number; onChanged: () => void }) {
  const [capturing, setCapturing] = useState<LoanFaceCheck | null>(null);
  const done = checks.filter((c) => c.verified).length;
  return (
    <section className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
      <h2 className="font-heading text-sm font-bold text-gray-800">Face match before disbursement</h2>
      <p className="mb-4 text-xs text-gray-500">
        Each client receiving money takes a live face capture, matched against their enrolled face. {done} of {checks.length} done.
      </p>
      <ul className="divide-y divide-gray-100">
        {checks.map((check) => (
          <li key={check.clientId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{check.clientName ?? `Client #${check.clientId}`}</p>
              {check.verified ? (
                <p className="inline-flex items-center gap-1 text-xs text-emerald-700">
                  <CheckCircle2Icon size={12} /> Matched {check.similarity?.toFixed(1)}%
                </p>
              ) : !check.enrolled ? (
                <p className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <ShieldAlertIcon size={12} /> No enrolled face — whoever onboarded them must capture it first
                </p>
              ) : (
                <p className="text-xs text-gray-500">{check.canVerify ? 'Not verified yet' : 'Not verified yet — your role can’t run this face match (Settings → Loan)'}</p>
              )}
            </div>
            {!check.verified && check.enrolled && check.canVerify && (
              <button
                onClick={() => setCapturing(check)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
              >
                <ScanFaceIcon size={16} /> Verify face
              </button>
            )}
          </li>
        ))}
      </ul>

      {capturing && (
        <FaceCaptureModal
          clientId={capturing.clientId}
          clientName={capturing.clientName ?? `Client #${capturing.clientId}`}
          purpose="loan"
          loanId={loanId}
          onClose={() => setCapturing(null)}
          onFinished={onChanged}
        />
      )}
    </section>
  );
}

function DisburseModal({ loan, onClose, onDisbursed }: { loan: LoanDetail; onClose: () => void; onDisbursed: () => void }) {
  const [amount, setAmount] = useState(loan.approvedAmount?.toString() ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const parsed = Number(amount);
  const invalid = !amount.trim() || !Number.isFinite(parsed) || parsed <= 0;

  const disburse = async () => {
    setSaving(true);
    try {
      await loansApi.disburse(loan.id, parsed, notes.trim() || null);
      toast.success('Loan disbursed and repayment schedule generated.');
      onDisbursed();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Disbursement failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-heading font-bold text-primary mb-2">Disburse Loan</h2>
        <p className="text-xs text-gray-500 mb-4">
          Pays out {loan.accountNumber ? `loan ${loan.accountNumber}` : 'the loan'} to {loan.applicantName ?? 'the applicant'} and generates the full repayment schedule.
        </p>
        <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="font-medium">{disbursementModeLabel(loan.disbursementMode)}</span>
          {payInto(loan) && <span className="block text-xs text-gray-500 mt-0.5">Pay into {payInto(loan)}</span>}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disbursed Amount</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">Approved: {formatMoney(loan.approvedAmount)}</p>
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
            onClick={() => void disburse()}
            disabled={saving || invalid}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving && <LoaderIcon size={14} className="animate-spin" />}
            Disburse
          </button>
        </div>
      </div>
    </div>
  );
}

function Schedule({ loanId, refreshToken }: { loanId: number; refreshToken: number }) {
  const { data, failed } = useLoad<ScheduleInstallment[]>(() => loansApi.schedule(loanId), [loanId, refreshToken]);
  const saves = (data ?? []).some((item) => item.customerPays !== null && item.customerPays !== item.totalDue);
  const columns = saves ? 8 : 7;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Due Date</th>
            <th className="px-4 py-3 font-medium">Principal</th>
            <th className="px-4 py-3 font-medium">Interest</th>
            <th className="px-4 py-3 font-medium">Total Due</th>
            {saves && <th className="px-4 py-3 font-medium" title="Includes the client's savings share">Client Pays</th>}
            <th className="px-4 py-3 font-medium">Paid</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {failed ? (
            <EmptyRow colSpan={columns}>Couldn't load the schedule.</EmptyRow>
          ) : !data ? (
            <EmptyRow colSpan={columns}>Loading…</EmptyRow>
          ) : data.length === 0 ? (
            <EmptyRow colSpan={columns}>No schedule yet — the loan hasn't been disbursed.</EmptyRow>
          ) : (
            data.map((item) => {
              const totalPaid = (item.principalPaid ?? 0) + (item.interestPaid ?? 0) + (item.feesPaid ?? 0) + (item.penaltyPaid ?? 0);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{item.installment}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(item.dueDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(item.principal)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(item.interest)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(item.totalDue)}</td>
                  {saves && <td className="px-4 py-3 font-medium text-gray-900">{formatMoney(item.customerPays)}</td>}
                  <td className="px-4 py-3 text-gray-700">{formatMoney(totalPaid)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.paid ? 'Paid' : 'Outstanding'}</span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function RescheduleRequests({ loanId, refreshToken }: { loanId: number; refreshToken: number }) {
  const { data } = useLoad<RescheduleRequest[]>(() => loansApi.rescheduleRequests(loanId), [loanId, refreshToken]);
  if (!data || data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-heading font-bold text-gray-500 uppercase tracking-wide mb-4">Reschedule Requests</h3>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">New Principal</th>
              <th className="px-4 py-3 font-medium">From Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{formatMoney(r.principal)}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(r.rescheduleFromDate)}</td>
                <td className="px-4 py-3 text-gray-700">{r.status}</td>
                <td className="px-4 py-3 text-gray-700">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Repayments({ loanId, refreshToken }: { loanId: number; refreshToken: number }) {
  const { data, failed } = useLoad<LoanTransaction[]>(() => loansApi.repayments(loanId), [loanId, refreshToken]);

  return (
    <div>
      <h3 className="text-sm font-heading font-bold text-gray-500 uppercase tracking-wide mb-4">Transactions</h3>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Principal</th>
              <th className="px-4 py-3 font-medium">Interest</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {failed ? (
              <EmptyRow colSpan={6}>Couldn't load the transactions.</EmptyRow>
            ) : !data ? (
              <EmptyRow colSpan={6}>Loading…</EmptyRow>
            ) : data.length === 0 ? (
              <EmptyRow colSpan={6}>No transactions yet.</EmptyRow>
            ) : (
              data.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{humanize(t.transactionType)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(t.amount)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(t.principal)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(t.interest)}</td>
                  <td className="px-4 py-3">
                    {t.reversed ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Reversed</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Charges({ loanId }: { loanId: number }) {
  const { data, failed } = useLoad<LoanCharge[]>(() => loansApi.charges(loanId), [loanId]);

  return (
    <div>
      <h3 className="text-sm font-heading font-bold text-gray-500 uppercase tracking-wide mb-4">Loan Charges</h3>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Basis</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium">Penalty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {failed ? (
              <EmptyRow colSpan={5}>Couldn't load the charges.</EmptyRow>
            ) : !data ? (
              <EmptyRow colSpan={5}>Loading…</EmptyRow>
            ) : data.length === 0 ? (
              <EmptyRow colSpan={5}>No charges on this loan.</EmptyRow>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{humanize(c.chargeType)}</td>
                  <td className="px-4 py-3 text-gray-700">{humanize(c.chargeOption)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatMoney(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(c.dueDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{c.penalty ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-gray-400">
        {children}
      </td>
    </tr>
  );
}
