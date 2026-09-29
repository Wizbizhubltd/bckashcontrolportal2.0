import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChevronDownIcon, LoaderIcon, XIcon } from 'lucide-react';
import {
  loanProductsApi,
  NEW_LOAN_PRODUCT,
  toFields,
  type LoanProduct,
  type LoanProductFields,
} from '../../api/loanProductsApi';
import { chargesApi, type Charge } from '../../api/chargesApi';
import { CHARGE_TYPES, PENALTY_TYPES, describeCharge } from './feeCatalog';
import { currencyAffix, formatMoney } from '../../utils/money';

const inputClasses = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

function Section({ title, description, children, collapsible = false }: { title: string; description?: string; children: ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className="border-t border-gray-100 pt-5">
      <button type="button" onClick={collapsible ? () => setOpen((o) => !o) : undefined} className={`w-full flex items-start justify-between gap-3 text-left ${collapsible ? '' : 'cursor-default'}`}>
        <div>
          <h4 className="text-sm font-heading font-bold text-gray-800">{title}</h4>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        {collapsible && <ChevronDownIcon size={16} className={`text-gray-400 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </section>
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

function NumberInput({ value, onChange, prefix, suffix, step = 'any' }: { value: number | null; onChange: (v: number | null) => void; prefix?: string; suffix?: string; step?: string }) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
      <input type="number" min={0} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className={inputClasses} />
      {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

function Select<T extends string>({ value, options, onChange }: { value: T | null; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value as T)} className={inputClasses}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Check({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/20" />
      <span>
        {label}
        {help && <span className="block text-xs text-gray-500">{help}</span>}
      </span>
    </label>
  );
}

/** Min / default / max in one row. */
function Triad({ label, help, values, onChange, prefix, suffix, step }: {
  label: string;
  help?: string;
  values: [number | null, number | null, number | null];
  onChange: (index: 0 | 1 | 2, v: number | null) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-800 mb-1">{label}</p>
      <div className="grid grid-cols-3 gap-3">
        {(['Minimum', 'Default', 'Maximum'] as const).map((caption, i) => (
          <div key={caption}>
            <NumberInput value={values[i]} onChange={(v) => onChange(i as 0 | 1 | 2, v)} prefix={prefix} suffix={suffix} step={step} />
            <span className="block text-[11px] text-gray-400 mt-0.5">{caption}</span>
          </div>
        ))}
      </div>
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
}

const FREQUENCIES: [LoanProductFields['repaymentFrequencyType'] & string, string][] = [
  ['Days', 'days'],
  ['Weeks', 'weeks'],
  ['Months', 'months'],
  ['Years', 'years'],
];

/** The first problem stopping the form being saved — the server checks all of this again. */
function problem(f: LoanProductFields): string | null {
  if (!f.name?.trim()) return 'Give the product a name.';
  if (f.minimumPrincipal == null || f.maximumPrincipal == null) return 'Set the smallest and largest amount.';
  if (f.maximumPrincipal <= 0) return 'The largest amount must be more than zero.';
  if (f.minimumLoanTerm == null || f.maximumLoanTerm == null) return 'Set the shortest and longest term.';
  if (f.defaultInterestRate == null) return 'Set the interest rate.';
  const ordered = (a: number | null, b: number | null, c: number | null) => [a, b, c].filter((v): v is number => v != null).every((v, i, arr) => i === 0 || arr[i - 1] <= v);
  if (!ordered(f.minimumPrincipal, f.defaultPrincipal, f.maximumPrincipal)) return 'Amounts must go minimum ≤ default ≤ maximum.';
  if (!ordered(f.minimumLoanTerm, f.defaultLoanTerm, f.maximumLoanTerm)) return 'Terms must go minimum ≤ default ≤ maximum.';
  if (!ordered(f.minimumInterestRate, f.defaultInterestRate, f.maximumInterestRate)) return 'Interest rates must go minimum ≤ default ≤ maximum.';
  if ([f.minimumInterestRate, f.defaultInterestRate, f.maximumInterestRate].some((r) => r != null && r > 100)) return 'Interest can’t be more than 100%.';
  return null;
}

interface LoanProductFormModalProps {
  /** Null = closed; 'new' = create; a product = edit. */
  product: LoanProduct | 'new' | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function LoanProductFormModal({ product, onClose, onSaved }: LoanProductFormModalProps) {
  const [form, setForm] = useState<LoanProductFields | null>(null);
  const [loanCharges, setLoanCharges] = useState<Charge[]>([]);
  const [attached, setAttached] = useState<Set<number>>(new Set());
  const [originalAttached, setOriginalAttached] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const editing = product !== null && product !== 'new';

  useEffect(() => {
    if (!product) {
      setForm(null);
      return;
    }
    setForm(product === 'new' ? { ...NEW_LOAN_PRODUCT } : toFields(product));
    setAttached(new Set());
    setOriginalAttached(new Set());
    void chargesApi
      .list()
      .then((all) => setLoanCharges(all.filter((c) => c.product === 'Loan' && c.active)))
      .catch(() => undefined);
    if (product !== 'new') {
      void loanProductsApi
        .charges(product.id)
        .then((ids) => {
          setAttached(new Set(ids));
          setOriginalAttached(new Set(ids));
        })
        .catch(() => undefined);
    }
  }, [product]);

  if (!product || !form) return <AnimatePresence />;

  const set = (patch: Partial<LoanProductFields>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  const blocker = problem(form);
  const fees = loanCharges.filter((c) => !PENALTY_TYPES.includes(c.chargeType));
  const penalties = loanCharges.filter((c) => PENALTY_TYPES.includes(c.chargeType));
  const toggleCharge = (id: number) =>
    setAttached((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (blocker) return;
    setSaving(true);
    try {
      const fields = { ...form, name: form.name?.trim() ?? '' };
      const saved = editing ? await loanProductsApi.update(product.id, fields) : await loanProductsApi.create(fields);
      // Only active charges can be attached; one switched off since it was attached drops off here.
      const wanted = [...attached].filter((id) => loanCharges.some((c) => c.id === id));
      const changed = wanted.length !== originalAttached.size || wanted.some((id) => !originalAttached.has(id));
      if (changed) {
        await loanProductsApi.setCharges(saved.id, wanted);
      }
      toast.success(`${saved.name} ${editing ? 'updated' : 'created'}.`);
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save the product.');
    } finally {
      setSaving(false);
    }
  };

  const chargeRow = (c: Charge) => (
    <label key={c.id} className="flex items-start gap-3 py-2 text-sm">
      <input type="checkbox" checked={attached.has(c.id)} onChange={() => toggleCharge(c.id)} className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/20" />
      <span>
        <span className="text-gray-800">{c.name}</span>
        <span className="text-xs text-gray-400"> · {CHARGE_TYPES[c.chargeType]?.label ?? c.chargeType}</span>
        <span className="block text-xs text-gray-500">{describeCharge(c)}</span>
      </span>
    </label>
  );

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4 z-10">
            <h3 className="text-lg font-heading font-bold text-gray-900">{editing ? `Edit ${product.name ?? 'loan product'}` : 'New loan product'}</h3>
            <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <XIcon size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {editing && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Changes apply to new applications and loans. Loans already disbursed keep the terms they were given.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Field label="Product name">
                  <input value={form.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Salary Advance" className={inputClasses} />
                </Field>
              </div>
              <Field label="Short name">
                <input value={form.shortName ?? ''} onChange={(e) => set({ shortName: e.target.value || null })} placeholder="e.g. SAL" className={inputClasses} />
              </Field>
            </div>
            <Field label="Description (optional)">
              <textarea rows={2} value={form.description ?? ''} onChange={(e) => set({ description: e.target.value || null })} className={inputClasses} />
            </Field>

            <Section title="Amount" description="Applications outside this range are refused.">
              <Triad
                label="Loan amount"
                help={`A minimum of ${formatMoney(0)} means no minimum.`}
                {...currencyAffix()}
                values={[form.minimumPrincipal, form.defaultPrincipal, form.maximumPrincipal]}
                onChange={(i, v) => set([{ minimumPrincipal: v }, { defaultPrincipal: v }, { maximumPrincipal: v }][i])}
              />
            </Section>

            <Section title="Term & repayments">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Repayments every">
                  <div className="flex gap-2">
                    <div className="w-24">
                      <NumberInput value={form.repaymentFrequency} onChange={(v) => set({ repaymentFrequency: v })} step="1" />
                    </div>
                    <Select value={form.repaymentFrequencyType} options={FREQUENCIES} onChange={(v) => set({ repaymentFrequencyType: v })} />
                  </div>
                </Field>
              </div>
              <Triad
                label="Loan term"
                help="Checked against the term on each application, in the unit chosen there (usually months)."
                step="1"
                values={[form.minimumLoanTerm, form.defaultLoanTerm, form.maximumLoanTerm]}
                onChange={(i, v) => set([{ minimumLoanTerm: v }, { defaultLoanTerm: v }, { maximumLoanTerm: v }][i])}
              />
            </Section>

            <Section title="Interest">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Rate is per">
                  <Select value={form.interestRateType} options={[['Day', 'day'], ['Week', 'week'], ['Month', 'month'], ['Year', 'year']]} onChange={(v) => set({ interestRateType: v })} />
                </Field>
                <Field label="Calculated on" help="Flat: on the original amount throughout. Declining: on what’s still owed.">
                  <Select value={form.interestMethod} options={[['Flat', 'Flat rate'], ['DecliningBalance', 'Declining balance']]} onChange={(v) => set({ interestMethod: v })} />
                </Field>
                <Field label="Instalments">
                  <Select value={form.amortizationMethod} options={[['EqualInstallment', 'Equal instalments'], ['EqualPrincipal', 'Equal principal']]} onChange={(v) => set({ amortizationMethod: v })} />
                </Field>
              </div>
              <Triad
                label="Interest rate"
                suffix="%"
                values={[form.minimumInterestRate, form.defaultInterestRate, form.maximumInterestRate]}
                onChange={(i, v) => set([{ minimumInterestRate: v }, { defaultInterestRate: v }, { maximumInterestRate: v }][i])}
              />
            </Section>

            <Section title="Fees & penalties" description="Fees and penalties from Settings → Fees & Payments that apply to this product’s loans.">
              {loanCharges.length === 0 ? (
                <p className="text-sm text-gray-400">No active loan fees or penalties yet — create them on the Fees & Payments tab.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <div>
                    <p className="text-xs font-heading font-bold text-gray-500 uppercase tracking-wider">Fees</p>
                    {fees.length ? fees.map(chargeRow) : <p className="text-xs text-gray-400 py-2">None</p>}
                  </div>
                  <div>
                    <p className="text-xs font-heading font-bold text-gray-500 uppercase tracking-wider">Penalties</p>
                    {penalties.length ? penalties.map(chargeRow) : <p className="text-xs text-gray-400 py-2">None</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Automatic penalties charge only the ticked ones on this product’s loans. Tick none and every active penalty applies.
                    </p>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Repayment order & arrears">
              <Field label="When a repayment comes in, pay off" help="Clearing penalties and fees first keeps them from lingering; clearing principal first lowers the risk on the loan fastest.">
                <Select
                  value={form.loanTransactionStrategy}
                  options={[
                    ['PenaltyFeesInterestPrincipal', 'Penalties → fees → interest → principal'],
                    ['InterestPrincipalPenaltyFees', 'Interest → principal → penalties → fees'],
                    ['PrincipalInterestPenaltyFees', 'Principal → interest → penalties → fees'],
                  ]}
                  onChange={(v) => set({ loanTransactionStrategy: v })}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Arrears tolerance" help="Days overdue before the loan is reported as in arrears.">
                  <NumberInput value={form.arrearsGraceDays} onChange={(v) => set({ arrearsGraceDays: v })} suffix="days" step="1" />
                </Field>
                <Field label="Non-performing after" help="Days overdue before the loan is classed as non-performing.">
                  <NumberInput value={form.npaDays} onChange={(v) => set({ npaDays: v })} suffix="days" step="1" />
                </Field>
              </div>
              <Check checked={form.npaSuspendIncome} onChange={(v) => set({ npaSuspendIncome: v })} label="Stop recognising interest income once non-performing" />
            </Section>

            <Section title="Grace periods (optional)" description="Measured in repayment periods from disbursement." collapsible>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="No principal due for">
                  <NumberInput value={form.graceOnPrincipal} onChange={(v) => set({ graceOnPrincipal: v })} suffix="periods" step="1" />
                </Field>
                <Field label="No interest due for">
                  <NumberInput value={form.graceOnInterestPayment} onChange={(v) => set({ graceOnInterestPayment: v })} suffix="periods" step="1" />
                </Field>
                <Field label="No interest charged for">
                  <NumberInput value={form.graceOnInterestCharged} onChange={(v) => set({ graceOnInterestCharged: v })} suffix="periods" step="1" />
                </Field>
              </div>
              <Check checked={form.allowCustomGrace} onChange={(v) => set({ allowCustomGrace: v })} label="Let staff change grace on individual loans" />
            </Section>

            <Section title="Advanced" description="Day-count conventions, accounting and other options." collapsible>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Days in a year">
                  <Select value={form.yearDays} options={[['Days365', '365'], ['Days360', '360'], ['Days364', '364'], ['Actual', 'Actual']]} onChange={(v) => set({ yearDays: v })} />
                </Field>
                <Field label="Days in a month">
                  <Select value={form.monthDays} options={[['Days30', '30'], ['Days31', '31'], ['Actual', 'Actual']]} onChange={(v) => set({ monthDays: v })} />
                </Field>
                <Field label="Interest calculated">
                  <Select value={form.interestCalculationPeriodType} options={[['Same', 'Per repayment period'], ['Daily', 'Daily']]} onChange={(v) => set({ interestCalculationPeriodType: v })} />
                </Field>
                <Field label="Accounting">
                  <Select
                    value={form.accountingRule}
                    options={[['Cash', 'Cash'], ['AccrualPeriodic', 'Accrual (periodic)'], ['AccrualUpfront', 'Accrual (upfront)'], ['None', 'None']]}
                    onChange={(v) => set({ accountingRule: v })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Check checked={form.allocateOverpayments} onChange={(v) => set({ allocateOverpayments: v })} label="Apply overpayments to future instalments" />
                <Check checked={form.allowAdditionalCharges} onChange={(v) => set({ allowAdditionalCharges: v })} label="Allow extra fees on individual loans" />
                <Check checked={form.includeInCycle} onChange={(v) => set({ includeInCycle: v })} label="Count towards the customer’s loan cycle" />
                <Check checked={form.lockGuarantee} onChange={(v) => set({ lockGuarantee: v })} label="Lock the guarantee until the loan is repaid" />
              </div>
            </Section>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            {blocker && <p className="text-xs text-amber-700 mr-auto">{blocker}</p>}
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !!blocker} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg disabled:opacity-50">
              {saving && <LoaderIcon size={14} className="animate-spin" />}
              {editing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
