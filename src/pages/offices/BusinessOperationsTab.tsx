import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  LandmarkIcon,
  LoaderIcon,
  PlusIcon,
  StarIcon,
  WalletIcon,
  XIcon,
} from 'lucide-react';
import { officeFundsApi, type Bank, type OfficeBusinessOperations, type OfficeFunding, type OfficeFundEventType, type OfficeFundingStatus } from '../../api/officeFundsApi';
import { StatCard } from '../../components/StatCard';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { currencyAffix, formatMoney } from '../../utils/money';

const inputClasses = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

const STATUS: Record<OfficeFundingStatus, { label: string; className: string }> = {
  PendingAcknowledgement: { label: 'Awaiting acknowledgement', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Acknowledged: { label: 'Acknowledged', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Disputed: { label: 'Disputed', className: 'bg-red-50 text-red-700 border-red-200' },
  Cancelled: { label: 'Cancelled', className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const EVENT_LABELS: Record<OfficeFundEventType, string> = {
  FundingSent: 'Funding sent',
  FundingAcknowledged: 'Funding acknowledged',
  FundingDisputed: 'Funding disputed',
  FundingCancelled: 'Funding cancelled',
  BankAccountAdded: 'Bank account added',
  DefaultAccountChanged: 'Default account changed',
  BankAccountDeactivated: 'Bank account deactivated',
  ManagerAssigned: 'Branch manager changed',
};

function when(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

function Section({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-sm font-heading font-bold text-gray-800">{title}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <XIcon size={18} />
            </button>
            <h3 className="text-lg font-heading font-bold text-gray-900 mb-4">{title}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-800 mb-1">{label}</span>
      {children}
      {help && <span className="block text-xs text-gray-500 mt-1">{help}</span>}
    </label>
  );
}

function FundOfficeModal({ open, ops, officeId, onClose, onDone }: { open: boolean; ops: OfficeBusinessOperations; officeId: number; onClose: () => void; onDone: () => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [fundedOn, setFundedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const account = ops.bankAccounts.find((a) => a.active && a.isDefault);
  const affix = currencyAffix();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await officeFundsApi.fund(officeId, { amount: Number(amount), reference: reference.trim(), fundedOn: fundedOn || null, notes: notes.trim() || null });
      toast.success(`Funding of ${formatMoney(Number(amount))} sent — waiting for ${ops.managerName ?? 'the manager'} to acknowledge it.`);
      setAmount('');
      setReference('');
      setNotes('');
      await onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fund the office.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Fund office" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 space-y-1">
          <p>
            Send to: <strong>{account ? `${account.bankName} · ${account.accountNumber} · ${account.accountName}` : '—'}</strong>
          </p>
          <p>
            To be acknowledged by: <strong>{ops.managerName ?? '—'}</strong>. It counts towards the office’s funds only once they confirm the money arrived.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Amount">
            <div className="flex items-center gap-2">
              {affix.prefix && <span className="text-sm text-gray-500">{affix.prefix}</span>}
              <input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClasses} required />
              {affix.suffix && <span className="text-sm text-gray-500">{affix.suffix}</span>}
            </div>
          </Field>
          <Field label="Date sent">
            <input type="date" value={fundedOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setFundedOn(e.target.value)} className={inputClasses} />
          </Field>
        </div>
        <Field label="Transfer reference" help="The bank’s reference for the transfer. The same reference can’t be recorded twice.">
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClasses} required />
        </Field>
        <Field label="Notes (optional)">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || !(Number(amount) > 0) || !reference.trim()} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg disabled:opacity-50">
            {saving && <LoaderIcon size={14} className="animate-spin" />}
            Send funding
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddAccountModal({ open, officeId, hasDefault, onClose, onDone }: { open: boolean; officeId: number; hasDefault: boolean; onClose: () => void; onDone: () => Promise<void> }) {
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    if (open && banks.length === 0) void officeFundsApi.banks().then(setBanks).catch(() => undefined);
  }, [open, banks.length]);

  // Grouped by CBN licence type, in the server's order.
  const groups = banks.reduce<Map<string, Bank[]>>((map, bank) => map.set(bank.category, [...(map.get(bank.category) ?? []), bank]), new Map());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await officeFundsApi.addBankAccount(officeId, { bankName, accountName, accountNumber, makeDefault });
      toast.success('Bank account added.');
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setMakeDefault(false);
      await onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add the account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Add bank account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Bank">
          <select value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClasses} required>
            <option value="">{banks.length ? 'Choose a bank…' : 'Loading banks…'}</option>
            {[...groups.entries()].map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Account name">
          <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClasses} required />
        </Field>
        <Field label="Account number" help="The 10-digit NUBAN.">
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" className={inputClasses} required />
        </Field>
        {hasDefault ? (
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/20" />
            <span>
              Make this the default account
              <span className="block text-xs text-gray-500">Customers’ loan repayments and office funding go to the default account.</span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-gray-500">This will be the office’s default account — where loan repayments and office funding go.</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving || accountNumber.length !== 10 || !bankName.trim() || !accountName.trim()} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg disabled:opacity-50">
            {saving && <LoaderIcon size={14} className="animate-spin" />}
            Add account
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FundingTrail({ f }: { f: OfficeFunding }) {
  return (
    <div className="text-xs text-gray-500 space-y-0.5">
      <p>
        Sent by {f.fundedByName ?? '—'} · {when(f.createdAt)}
      </p>
      {f.acknowledgedAt && (
        <p className="text-emerald-700">
          Acknowledged by {f.acknowledgedByName ?? '—'} · {when(f.acknowledgedAt)}
        </p>
      )}
      {f.disputedAt && (
        <p className="text-red-700">
          Disputed by {f.disputedByName ?? '—'} · {when(f.disputedAt)} — “{f.disputeReason}”
        </p>
      )}
      {f.cancelledAt && (
        <p>
          Cancelled by {f.cancelledByName ?? '—'} · {when(f.cancelledAt)} — “{f.cancelReason}”
        </p>
      )}
    </div>
  );
}

/** Office → Business Operations: the office's funds, bank accounts and funding. */
export function BusinessOperationsTab({ officeId, officeActive }: { officeId: number; officeActive: boolean }) {
  const [ops, setOps] = useState<OfficeBusinessOperations | null>(null);
  const [fundOpen, setFundOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<OfficeFunding | null>(null);

  const load = async () => {
    try {
      setOps(await officeFundsApi.get(officeId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load business operations.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId]);

  if (!ops) return <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">Loading…</div>;

  const defaultAccount = ops.bankAccounts.find((a) => a.active && a.isDefault);
  const fundBlocker = !officeActive
    ? 'Activate the office to fund it.'
    : !ops.managerId
      ? 'Assign a branch manager first — they acknowledge the funding.'
      : !defaultAccount
        ? 'Add a default bank account first.'
        : null;

  const act = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed.');
    }
  };

  return (
    <div className="space-y-4">
      {!ops.loansRequireFunds && (
        <div className="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertTriangleIcon size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Loans don’t draw on office funds yet — approvals and disbursements aren’t limited by these balances. Switch on “Loans draw on office funds” in{' '}
            <Link to="/settings?tab=loan" className="underline">
              Rules &amp; Settings → Loan
            </Link>{' '}
            once your offices are funded.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard colored label="Available for new loans" value={formatMoney(ops.available)} sublabel="Balance less loans already approved" icon={WalletIcon} tone={ops.available > 0 ? 'success' : 'danger'} />
        <StatCard colored label="Balance" value={formatMoney(ops.balance)} sublabel="Acknowledged funding less loans disbursed" icon={LandmarkIcon} tone="primary" />
        <StatCard colored label="Committed" value={formatMoney(ops.committed)} sublabel="Approved, awaiting disbursement" icon={ClockIcon} tone="info" />
        <StatCard colored label="Pending funding" value={formatMoney(ops.pendingAmount)} sublabel={`${ops.pendingCount} awaiting acknowledgement or disputed`} icon={BanknoteIcon} tone={ops.pendingCount ? 'warning' : 'neutral'} />
      </div>

      <Section
        title="Funding"
        description={`Funding counts only once ${ops.managerName ?? 'the office’s branch manager'} acknowledges it. They can dispute it with a bank statement instead.`}
        action={
          <div className="flex flex-col items-end gap-1">
            <button type="button" onClick={() => setFundOpen(true)} disabled={!!fundBlocker} className="flex items-center gap-1.5 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
              <BanknoteIcon size={16} />
              Fund office
            </button>
            {fundBlocker && <span className="text-[11px] text-amber-700">{fundBlocker}</span>}
          </div>
        }
      >
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Reference</th>
                <th className="px-5 py-2.5 font-medium">Status &amp; trail</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ops.fundings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-gray-400">
                    No funding yet.
                  </td>
                </tr>
              ) : (
                ops.fundings.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="px-5 py-3 font-medium text-gray-800 tabular-nums whitespace-nowrap">
                      {formatMoney(f.amount)}
                      <span className="block text-xs font-normal text-gray-400">sent {f.fundedOn}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <span className="font-mono text-xs">{f.reference}</span>
                      {f.bankAccountLabel && <span className="block text-xs text-gray-400">to {f.bankAccountLabel}</span>}
                      {f.notes && <span className="block text-xs text-gray-500">{f.notes}</span>}
                    </td>
                    <td className="px-5 py-3 space-y-1.5">
                      <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${STATUS[f.status].className}`}>{STATUS[f.status].label}</span>
                      <FundingTrail f={f} />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap space-x-2">
                      {f.disputeDocumentName && (
                        <button type="button" onClick={() => void officeFundsApi.openStatement(f.id).catch(() => toast.error('Could not open the bank statement.'))} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <FileTextIcon size={12} />
                          Bank statement
                        </button>
                      )}
                      {(f.status === 'PendingAcknowledgement' || f.status === 'Disputed') && (
                        <button type="button" onClick={() => setCancelTarget(f)} className="text-xs text-red-600 hover:underline">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Bank accounts"
        description="Customers’ loan repayments are paid into the default account, and office funding is sent to it."
        action={
          <button type="button" onClick={() => setAccountOpen(true)} className="flex items-center gap-1.5 text-sm font-heading font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/5">
            <PlusIcon size={16} />
            Add bank account
          </button>
        }
      >
        {ops.bankAccounts.length === 0 ? (
          <p className="text-sm text-gray-400">No bank accounts yet. The first one added becomes the default.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ops.bankAccounts.map((a) => (
              <div key={a.id} className={`rounded-lg border p-3 ${a.isDefault ? 'border-primary/40 bg-primary/5' : 'border-gray-200'} ${a.active ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-heading font-bold text-gray-800 flex items-center gap-1.5">
                      {a.bankName}
                      {a.isDefault && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">
                          <StarIcon size={11} /> Default
                        </span>
                      )}
                      {!a.active && <span className="text-[11px] font-medium text-gray-500">Deactivated</span>}
                    </p>
                    <p className="text-sm font-mono text-gray-700">{a.accountNumber}</p>
                    <p className="text-xs text-gray-500">{a.accountName}</p>
                  </div>
                  {a.active && !a.isDefault && (
                    <div className="flex flex-col items-end gap-1">
                      <button type="button" onClick={() => void act(() => officeFundsApi.setDefault(officeId, a.id), `${a.bankName} is now the default account.`)} className="text-xs text-primary hover:underline">
                        Make default
                      </button>
                      <button type="button" onClick={() => void act(() => officeFundsApi.deactivateAccount(officeId, a.id), 'Bank account deactivated.')} className="text-xs text-red-600 hover:underline">
                        Deactivate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Fund ledger" description="Every movement on the office’s funds.">
          {ops.entries.length === 0 ? (
            <p className="text-sm text-gray-400">No movements yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 -my-2">
              {ops.entries.map((e) => (
                <li key={e.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="text-gray-800">{e.description ?? e.type}</p>
                    <p className="text-xs text-gray-400">
                      {when(e.createdAt)}
                      {e.createdByName ? ` · ${e.createdByName}` : ''}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className={`tabular-nums font-medium ${e.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {e.amount >= 0 ? '+' : ''}
                      {formatMoney(e.amount)}
                    </p>
                    <p className="text-xs text-gray-400 tabular-nums">bal. {formatMoney(e.balanceAfter)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Activity" description="Who did what, and when.">
          {ops.activity.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {ops.activity.map((e) => (
                <li key={e.id} className="flex gap-2 text-sm">
                  <CheckCircle2Icon size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-800">
                      {EVENT_LABELS[e.type]}
                      {e.amount != null && ` · ${formatMoney(e.amount)}`}
                    </p>
                    {e.comment && <p className="text-xs text-gray-600">“{e.comment}”</p>}
                    <p className="text-xs text-gray-400">
                      {e.actorName ?? 'System'} · {when(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      <FundOfficeModal open={fundOpen} ops={ops} officeId={officeId} onClose={() => setFundOpen(false)} onDone={load} />
      <AddAccountModal open={accountOpen} officeId={officeId} hasDefault={!!defaultAccount} onClose={() => setAccountOpen(false)} onDone={load} />
      <ConfirmationModal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          const target = cancelTarget;
          setCancelTarget(null);
          if (target) void act(() => officeFundsApi.cancel(target.id, reason ?? ''), 'Funding cancelled.');
        }}
        title="Cancel this funding?"
        description={cancelTarget ? `${formatMoney(cancelTarget.amount)} (${cancelTarget.reference}) will be withdrawn and won’t count towards the office’s funds.` : ''}
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel="Cancel funding"
        confirmVariant="danger"
      />
    </div>
  );
}
