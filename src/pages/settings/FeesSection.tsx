import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangleIcon, ClockIcon, LogOutIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { chargesApi, type Charge, type ChargeProduct } from '../../api/chargesApi';
import { glAccountsApi, type GlAccount } from '../../api/glAccountsApi';
import { CHARGE_TYPES, PENALTY_TYPES, PRODUCT_LABELS, describeCharge, type Lifecycle } from './feeCatalog';
import { FeeFormModal, type FeeDraft, type FeeKind } from './FeeFormModal';

const LIFECYCLE_STYLES: Record<Lifecycle, string> = {
  'One-time': 'bg-sky-50 text-sky-700 border-sky-200',
  Recurring: 'bg-violet-50 text-violet-700 border-violet-200',
  'Per transaction': 'bg-gray-50 text-gray-600 border-gray-200',
  'When triggered': 'bg-amber-50 text-amber-700 border-amber-200',
};

/** Quick starts for the three penalties — structure and grace pre-filled, the amount left to the lender. */
const PENALTY_PRESETS: { label: string; description: string; icon: typeof ClockIcon; draft: FeeDraft }[] = [
  {
    label: 'Late repayment fee',
    description: 'An instalment is missed',
    icon: ClockIcon,
    draft: { name: 'Late repayment fee', product: 'Loan', chargeType: 'OverdueInstallmentFee', chargeOption: 'InstallmentPrincipalInterestDue', graceDays: 3 },
  },
  {
    label: 'Loan default penalty',
    description: 'Unpaid after the final date',
    icon: AlertTriangleIcon,
    draft: { name: 'Loan default penalty', product: 'Loan', chargeType: 'OverdueMaturity', chargeOption: 'PrincipalDue', graceDays: 30 },
  },
  {
    label: 'Early closure fee',
    description: 'Paid off ahead of schedule',
    icon: LogOutIcon,
    draft: { name: 'Early closure fee', product: 'Loan', chargeType: 'EarlyRepayment', chargeOption: 'PrincipalDue' },
  },
];

function Switch({ on, disabled, label, onToggle }: { on: boolean; disabled?: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ChargeTable({ charges, penalty, busyId, onEdit, onToggle }: { charges: Charge[]; penalty: boolean; busyId: number | null; onEdit: (c: Charge) => void; onToggle: (c: Charge) => void }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-5 py-2.5 font-medium">Name</th>
            {!penalty && <th className="px-5 py-2.5 font-medium">Applies to</th>}
            <th className="px-5 py-2.5 font-medium">{penalty ? 'Charged when' : 'Type'}</th>
            <th className="px-5 py-2.5 font-medium">Rule</th>
            <th className="px-5 py-2.5 font-medium text-right">In use</th>
            <th className="px-5 py-2.5 font-medium text-right">Active</th>
            <th className="px-5 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {charges.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-6 text-center text-gray-400">
                {penalty ? 'No penalties yet — start from one of the templates above.' : 'No fees yet.'}
              </td>
            </tr>
          ) : (
            charges.map((c) => {
              const info = CHARGE_TYPES[c.chargeType];
              return (
                <tr key={c.id} className={c.active ? '' : 'opacity-60'}>
                  <td className="px-5 py-3 text-gray-800 font-medium">{c.name ?? `Charge #${c.id}`}</td>
                  {!penalty && <td className="px-5 py-3 text-gray-700">{PRODUCT_LABELS[c.product]}</td>}
                  <td className="px-5 py-3">
                    <span className="block text-gray-700">{info?.label ?? c.chargeType}</span>
                    {info && <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border ${LIFECYCLE_STYLES[info.lifecycle]}`}>{info.lifecycle}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 min-w-[14rem]">{describeCharge(c)}</td>
                  <td className="px-5 py-3 text-gray-700 text-right tabular-nums">{c.usageCount}</td>
                  <td className="px-5 py-3 text-right">
                    <Switch on={c.active} disabled={busyId === c.id} label={`${c.name ?? 'Charge'} active`} onToggle={() => onToggle(c)} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => onEdit(c)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Edit">
                      <PencilIcon size={16} />
                    </button>
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

/** Settings → Fees & Payments: the fee and penalty catalogue. */
export function FeesSection() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<ChargeProduct | ''>('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ kind: FeeKind; draft: FeeDraft } | null>(null);

  const load = async () => {
    try {
      setCharges(await chargesApi.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load fees.');
    }
  };

  useEffect(() => {
    void Promise.all([load(), glAccountsApi.list().then(setGlAccounts).catch(() => undefined)]).finally(() => setLoading(false));
  }, []);

  const toggle = async (charge: Charge) => {
    setBusyId(charge.id);
    try {
      if (charge.active) {
        await chargesApi.deactivate(charge.id);
        toast.success(`${charge.name} switched off. Loans it's already on keep it.`);
      } else {
        await chargesApi.activate(charge.id);
        toast.success(`${charge.name} switched on.`);
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update.');
    } finally {
      setBusyId(null);
    }
  };

  // By type rather than the stored flag, which some legacy rows have wrong.
  const isPenalty = (c: Charge) => PENALTY_TYPES.includes(c.chargeType);
  const fees = charges.filter((c) => !isPenalty(c) && (!level || c.product === level));
  const penalties = charges.filter(isPenalty);

  if (loading) return <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">Loading…</div>;

  return (
    <>
      <div className="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertTriangleIcon size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Late repayment and default penalties are charged automatically once a day when “Apply penalties automatically” is on (Loan tab). A penalty attached to a
          loan product applies only to that product’s loans; otherwise every active penalty applies to all loans. Fees and early closure fees aren’t charged
          automatically yet — staff attach them from the loan’s page in the office portal.
        </span>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-heading font-bold text-gray-800">Fees</h3>
            <p className="text-xs text-gray-500 mt-1">What customers pay for a service — once, on a schedule, or per transaction.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={level} onChange={(e) => setLevel(e.target.value as ChargeProduct | '')} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All levels</option>
              {(['Loan', 'Client', 'Group', 'Savings'] as ChargeProduct[]).map((p) => (
                <option key={p} value={p}>
                  {PRODUCT_LABELS[p]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setEditor({ kind: 'fee', draft: { product: level || 'Loan', chargeType: level === 'Client' || level === 'Group' ? 'Activation' : level === 'Savings' ? 'SavingsActivation' : 'Disbursement' } })}
              className="flex items-center gap-1.5 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-3 py-1.5 rounded-lg"
            >
              <PlusIcon size={16} />
              New fee
            </button>
          </div>
        </div>
        <ChargeTable charges={fees} penalty={false} busyId={busyId} onEdit={(c) => setEditor({ kind: 'fee', draft: c })} onToggle={(c) => void toggle(c)} />
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-heading font-bold text-gray-800">Penalty payments</h3>
          <p className="text-xs text-gray-500 mt-1">Charged because of what the borrower does — paying late, defaulting, or closing early. Kept separate from fees in reports, repayment order and waivers.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {PENALTY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setEditor({ kind: 'penalty', draft: preset.draft })}
              className="group flex items-start gap-3 rounded-lg border border-dashed border-gray-300 p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <preset.icon size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <span>
                <span className="flex items-center gap-1 text-sm font-heading font-bold text-gray-800 group-hover:text-primary">
                  <PlusIcon size={12} />
                  {preset.label}
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">{preset.description}</span>
              </span>
            </button>
          ))}
        </div>
        <ChargeTable charges={penalties} penalty busyId={busyId} onEdit={(c) => setEditor({ kind: 'penalty', draft: c })} onToggle={(c) => void toggle(c)} />
      </section>

      <FeeFormModal kind={editor?.kind ?? 'fee'} draft={editor?.draft ?? null} glAccounts={glAccounts} onClose={() => setEditor(null)} onSaved={load} />
    </>
  );
}
