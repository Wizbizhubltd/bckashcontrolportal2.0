import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { InfoIcon, LoaderIcon, XIcon } from 'lucide-react';
import { chargesApi, type Charge, type ChargeOption, type ChargeProduct, type ChargeType, type SaveChargeInput } from '../../api/chargesApi';
import type { GlAccount } from '../../api/glAccountsApi';
import { currencyAffix, formatMoney, getCurrencyDisplay } from '../../utils/money';
import {
  BASE_LABELS,
  CHARGE_TYPES,
  FEE_LEVELS,
  LATENESS_TYPES,
  PENALTY_GUIDANCE,
  PRODUCT_LABELS,
  allowedOptions,
  describeCharge,
  typesFor,
} from './feeCatalog';

export type FeeKind = 'fee' | 'penalty';

/** A starting point for a new charge — an existing charge when editing, or a preset. */
export type FeeDraft = Partial<Charge> & { product: ChargeProduct; chargeType: ChargeType };

interface FormState {
  name: string;
  product: ChargeProduct;
  chargeType: ChargeType;
  nature: 'fixed' | 'percentage';
  base: ChargeOption;
  amount: string;
  minimumAmount: string;
  maximumAmount: string;
  graceDays: string;
  repeats: boolean;
  repeatEveryDays: string;
  maxTotalPercent: string;
  freeAfterInstallments: string;
  glAccountIncomeId: string;
}

const str = (v: number | null | undefined) => (v == null ? '' : String(v));
const num = (v: string) => (v.trim() === '' ? null : Number(v));

function firstPercentageBase(type: ChargeType, product: ChargeProduct): ChargeOption | undefined {
  return allowedOptions(type, product).find((o) => o !== 'Flat');
}

function toForm(draft: FeeDraft): FormState {
  const option = draft.chargeOption ?? 'Flat';
  return {
    name: draft.name ?? '',
    product: draft.product,
    chargeType: draft.chargeType,
    nature: option === 'Flat' ? 'fixed' : 'percentage',
    base: option === 'Flat' ? firstPercentageBase(draft.chargeType, draft.product) ?? 'Flat' : option,
    amount: str(draft.amount),
    minimumAmount: str(draft.minimumAmount),
    maximumAmount: str(draft.maximumAmount),
    graceDays: str(draft.graceDays),
    repeats: draft.repeatEveryDays != null,
    repeatEveryDays: str(draft.repeatEveryDays),
    maxTotalPercent: str(draft.maxTotalPercent),
    freeAfterInstallments: str(draft.freeAfterInstallments),
    glAccountIncomeId: str(draft.glAccountIncomeId),
  };
}

function toInput(f: FormState): SaveChargeInput {
  const percentage = f.nature === 'percentage';
  const lateness = LATENESS_TYPES.includes(f.chargeType);
  return {
    name: f.name.trim(),
    product: f.product,
    chargeType: f.chargeType,
    chargeOption: percentage ? f.base : 'Flat',
    amount: Number(f.amount),
    minimumAmount: percentage ? num(f.minimumAmount) : null,
    maximumAmount: percentage ? num(f.maximumAmount) : null,
    glAccountIncomeId: num(f.glAccountIncomeId),
    graceDays: lateness ? num(f.graceDays) : null,
    repeatEveryDays: lateness && f.repeats ? num(f.repeatEveryDays) : null,
    maxTotalPercent: lateness ? num(f.maxTotalPercent) : null,
    freeAfterInstallments: f.chargeType === 'EarlyRepayment' ? num(f.freeAfterInstallments) : null,
  };
}

/** The first thing stopping the form from being saved, if any — the server checks all of this again. */
function problem(input: SaveChargeInput, f: FormState): string | null {
  if (!input.name) return 'Give it a name.';
  if (!(input.amount > 0)) return 'Enter an amount above zero.';
  if (f.nature === 'percentage' && input.amount > 100) return 'A percentage can’t be more than 100.';
  if (input.minimumAmount != null && input.maximumAmount != null && input.minimumAmount > input.maximumAmount) return 'The minimum can’t be more than the maximum.';
  if (f.repeats && !(input.repeatEveryDays && input.repeatEveryDays >= 1)) return 'Say how many days between repeats.';
  if (input.repeatEveryDays && input.maxTotalPercent == null) return 'A repeating penalty needs a total cap.';
  if (input.maxTotalPercent != null && !(input.maxTotalPercent > 0 && input.maxTotalPercent <= 100)) return 'The cap must be between 0 and 100%.';
  return null;
}

const inputClasses = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-800 mb-1">{label}</span>
      {children}
      {help && <span className="block text-xs text-gray-500 mt-1">{help}</span>}
    </label>
  );
}

function Suffixed({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
      {children}
      {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}

interface FeeFormModalProps {
  kind: FeeKind;
  /** Null = closed. `id` present = editing. */
  draft: FeeDraft | null;
  glAccounts: GlAccount[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function FeeFormModal({ kind, draft, glAccounts, onClose, onSaved }: FeeFormModalProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(draft ? toForm(draft) : null);
  }, [draft]);

  if (!draft || !form) return <AnimatePresence />;

  const editing = draft.id != null;
  const penalty = kind === 'penalty';
  const typeInfo = CHARGE_TYPES[form.chargeType];
  const percentageBases = allowedOptions(form.chargeType, form.product).filter((o): o is Exclude<ChargeOption, 'Flat'> => o !== 'Flat');
  const lateness = LATENESS_TYPES.includes(form.chargeType);
  const input = toInput(form);
  const blocker = problem(input, form);

  const set = (patch: Partial<FormState>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const changeType = (chargeType: ChargeType, product = form.product) => {
    const base = firstPercentageBase(chargeType, product);
    set({
      chargeType,
      product,
      base: base && allowedOptions(chargeType, product).includes(form.base) ? form.base : base ?? 'Flat',
      nature: base ? form.nature : 'fixed',
    });
  };

  const changeProduct = (product: ChargeProduct) => {
    const types = typesFor(product, penalty);
    changeType(types.includes(form.chargeType) ? form.chargeType : types[0], product);
  };

  // Worked example on 100,000 of whatever the percentage is taken of.
  const example = (() => {
    if (form.nature !== 'percentage' || !(input.amount > 0)) return null;
    let value = (100_000 * input.amount) / 100;
    if (input.minimumAmount != null) value = Math.max(value, input.minimumAmount);
    if (input.maximumAmount != null) value = Math.min(value, input.maximumAmount);
    return `On ${formatMoney(100_000)} of ${BASE_LABELS[form.base as Exclude<ChargeOption, 'Flat'>]}, this charges ${formatMoney(value)}.`;
  })();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (blocker) return;
    setSaving(true);
    try {
      if (editing) {
        await chargesApi.update(draft.id as number, input);
      } else {
        await chargesApi.create(input);
      }
      toast.success(`${input.name} ${editing ? 'updated' : 'created'}.`);
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const incomeAccounts = glAccounts.filter((g) => g.accountType === 'Income' && (g.active || String(g.id) === form.glAccountIncomeId));

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4 z-10">
            <div>
              <h3 className="text-lg font-heading font-bold text-gray-900">
                {editing ? `Edit ${penalty ? 'penalty' : 'fee'}` : penalty ? 'New penalty' : 'New fee'}
              </h3>
              {editing && draft.usageCount ? (
                <p className="text-xs text-amber-700 mt-0.5">Attached to {draft.usageCount} loan(s) or account(s). Changes apply to future charges; amounts already charged stay as they are.</p>
              ) : null}
            </div>
            <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <XIcon size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            <Field label="Name">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={penalty ? 'e.g. Late repayment fee' : 'e.g. Loan processing fee'} className={inputClasses} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!penalty && (
                <Field label="Applies to">
                  <select value={form.product} onChange={(e) => changeProduct(e.target.value as ChargeProduct)} className={inputClasses}>
                    {FEE_LEVELS.map((p) => (
                      <option key={p} value={p}>
                        {PRODUCT_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={penalty ? 'Penalty for' : 'Fee type'}>
                <select value={form.chargeType} onChange={(e) => changeType(e.target.value as ChargeType)} className={inputClasses}>
                  {typesFor(form.product, penalty).map((t) => (
                    <option key={t} value={t}>
                      {CHARGE_TYPES[t].label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-heading font-bold text-gray-700 whitespace-nowrap">{typeInfo.lifecycle}</span>
              <span>· {typeInfo.when}</span>
            </div>

            {penalty && PENALTY_GUIDANCE[form.chargeType] && (
              <div className="flex gap-2 text-xs text-sky-800 bg-sky-50 border border-sky-100 rounded-lg p-3">
                <InfoIcon size={14} className="flex-shrink-0 mt-0.5" />
                <span>{PENALTY_GUIDANCE[form.chargeType]}</span>
              </div>
            )}

            <fieldset>
              <legend className="text-sm text-gray-800 mb-2">How is the amount worked out?</legend>
              <div className="flex gap-2">
                {(['fixed', 'percentage'] as const).map((n) => {
                  const disabled = n === 'percentage' && percentageBases.length === 0;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={disabled}
                      onClick={() => set({ nature: n })}
                      title={disabled ? 'Only a fixed amount is allowed for this fee.' : undefined}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${form.nature === n ? 'border-primary bg-primary/5 text-primary font-heading font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {n === 'fixed' ? `Fixed amount (${getCurrencyDisplay().symbol})` : 'Percentage (%)'}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={form.nature === 'fixed' ? 'Amount' : 'Rate'}>
                <Suffixed {...(form.nature === 'fixed' ? currencyAffix() : { suffix: '%' })}>
                  <input type="number" min={0} step="any" value={form.amount} onChange={(e) => set({ amount: e.target.value })} className={inputClasses} />
                </Suffixed>
              </Field>
              {form.nature === 'percentage' && (
                <Field label="Percentage of">
                  {percentageBases.length === 1 ? (
                    <p className="text-sm text-gray-700 py-2">{BASE_LABELS[percentageBases[0]]}</p>
                  ) : (
                    <select value={form.base} onChange={(e) => set({ base: e.target.value as ChargeOption })} className={inputClasses}>
                      {percentageBases.map((o) => (
                        <option key={o} value={o}>
                          {BASE_LABELS[o]}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              )}
            </div>

            {form.nature === 'percentage' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Never less than (optional)">
                  <Suffixed {...currencyAffix()}>
                    <input type="number" min={0} step="any" value={form.minimumAmount} onChange={(e) => set({ minimumAmount: e.target.value })} className={inputClasses} />
                  </Suffixed>
                </Field>
                <Field label="Never more than (optional)">
                  <Suffixed {...currencyAffix()}>
                    <input type="number" min={0} step="any" value={form.maximumAmount} onChange={(e) => set({ maximumAmount: e.target.value })} className={inputClasses} />
                  </Suffixed>
                </Field>
              </div>
            )}

            {lateness && (
              <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                <p className="text-sm font-heading font-bold text-gray-800">Penalty controls</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Grace period" help={form.chargeType === 'OverdueMaturity' ? 'Days after the final repayment date.' : 'Days after the instalment’s due date.'}>
                    <Suffixed suffix="days">
                      <input type="number" min={0} value={form.graceDays} onChange={(e) => set({ graceDays: e.target.value })} className={inputClasses} />
                    </Suffixed>
                  </Field>
                  <Field label="Total cap" help={form.repeats ? 'Required when it repeats.' : 'Strongly recommended.'}>
                    <Suffixed suffix="% of amount disbursed">
                      <input type="number" min={0} max={100} step="any" value={form.maxTotalPercent} onChange={(e) => set({ maxTotalPercent: e.target.value })} className={inputClasses} />
                    </Suffixed>
                  </Field>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm text-gray-800 mb-1">How often</legend>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" checked={!form.repeats} onChange={() => set({ repeats: false })} className="text-primary focus:ring-primary/20" />
                    Charge once
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 flex-wrap">
                    <input type="radio" checked={form.repeats} onChange={() => set({ repeats: true })} className="text-primary focus:ring-primary/20" />
                    Charge again every
                    <input
                      type="number"
                      min={1}
                      value={form.repeatEveryDays}
                      onChange={(e) => set({ repeats: true, repeatEveryDays: e.target.value })}
                      className="w-20 px-2 py-1 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    days while still unpaid
                  </label>
                </fieldset>
              </div>
            )}

            {form.chargeType === 'EarlyRepayment' && (
              <Field label="No fee after (optional)" help="Waive the fee once the borrower has paid this many instalments.">
                <Suffixed suffix="instalments paid">
                  <input type="number" min={1} value={form.freeAfterInstallments} onChange={(e) => set({ freeAfterInstallments: e.target.value })} className={inputClasses} />
                </Suffixed>
              </Field>
            )}

            <Field label="Income account (optional)" help="Where the money is booked in the general ledger.">
              <select value={form.glAccountIncomeId} onChange={(e) => set({ glAccountIncomeId: e.target.value })} className={inputClasses}>
                <option value="">Not set</option>
                {incomeAccounts.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.glCode ? `${g.glCode} · ` : ''}
                    {g.name ?? `Account #${g.id}`}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <p className="text-xs text-gray-500">Rule</p>
              <p className="text-sm text-gray-800 mt-0.5">{input.amount > 0 ? describeCharge(input) : 'Enter an amount to see the rule.'}</p>
              {example && <p className="text-xs text-gray-500 mt-1">{example}</p>}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
            {blocker && <p className="text-xs text-amber-700 mr-auto">{blocker}</p>}
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !!blocker} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg disabled:opacity-50">
              {saving && <LoaderIcon size={14} className="animate-spin" />}
              {editing ? 'Save changes' : penalty ? 'Create penalty' : 'Create fee'}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>
  );
}
