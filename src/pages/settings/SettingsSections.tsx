import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowUpRightIcon, ChevronDownIcon, PencilIcon, PlusIcon, SaveIcon, TrashIcon } from 'lucide-react';
import { settingsApi, type Setting } from '../../api/settingsApi';
import { loanProductsApi, type LoanProduct } from '../../api/loanProductsApi';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { EnforcementBadge } from './SettingGroupCard';
import { LoanProductFormModal } from './LoanProductFormModal';
import { formatMoney } from '../../utils/money';

function SectionCard({ title, description, enforced, action, children }: { title: string; description?: string; enforced?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-heading font-bold text-gray-800">{title}</h3>
            {enforced !== undefined && <EnforcementBadge enforced={enforced} />}
          </div>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Built-in rules the system applies today — shown read-only so admins know they exist. */
function RuleList({ rules }: { rules: string[] }) {
  return (
    <ul className="space-y-2">
      {rules.map((rule) => (
        <li key={rule} className="flex gap-2 text-sm text-gray-700">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          {rule}
        </li>
      ))}
    </ul>
  );
}

function LinkTiles({ links }: { links: { to: string; label: string; description: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="group rounded-lg border border-gray-200 p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
          <span className="flex items-center justify-between text-sm font-heading font-bold text-gray-800 group-hover:text-primary">
            {l.label}
            <ArrowUpRightIcon size={14} className="text-gray-300 group-hover:text-primary" />
          </span>
          <span className="block text-xs text-gray-500 mt-1">{l.description}</span>
        </Link>
      ))}
    </div>
  );
}

export function OfficeStructureSection() {
  return (
    <SectionCard title="Office structure" description="Where offices sit and how they're grouped. Changes here take effect immediately." enforced>
      <LinkTiles
        links={[
          { to: '/offices', label: 'Offices', description: 'Branches, head office, and their locations.' },
          { to: '/zones', label: 'Zones', description: 'Groups of offices. Names must be unique.' },
          { to: '/cities', label: 'Cities', description: 'Cities available when placing an office.' },
        ]}
      />
    </SectionCard>
  );
}

export function AccessRulesSection() {
  return (
    <SectionCard title="Built-in access rules" description="Applied to every staff member. They can't be switched off." enforced>
      <RuleList
        rules={[
          'Every staff member has one role: Super Admin, Controller, Director, Manager or Marketer.',
          'Maker-checker: an Initiator creates a staff record, and an Authorizer with the same role must approve it before it can sign in. Super admins skip this.',
          'Each account can be signed in on one device at a time — signing in elsewhere signs the other device out.',
          'Every sign-in needs a one-time code, and a temporary password must be changed at first sign-in.',
          'Only super admins can create, edit or delete zones.',
        ]}
      />
      <div className="mt-4">
        <LinkTiles
          links={[
            { to: '/staff', label: 'Staff Directory', description: 'Change a staff member’s role, class, office or access.' },
            { to: '/super-admins', label: 'Super Admins', description: 'Accounts with full access.' },
            { to: '/staff?onboardingStatus=Pending', label: 'Pending approvals', description: 'Staff records waiting for an Authorizer.' },
          ]}
        />
      </div>
    </SectionCard>
  );
}

export function ClientRulesSection() {
  return (
    <SectionCard title="Built-in customer rules" description="Applied to every customer record." enforced>
      <RuleList
        rules={[
          'Customer account numbers are generated automatically and are unique.',
          'New customers start as Pending; only a Pending customer can be activated or declined.',
          'Declining or deactivating a customer requires a reason.',
        ]}
      />
    </SectionCard>
  );
}

function formatAmount(value: number | null | undefined) {
  return formatMoney(value, 0);
}

function range(min: number | null | undefined, max: number | null | undefined, format: (v: number | null | undefined) => string = (v) => (v == null ? '—' : String(v))) {
  if (min == null && max == null) return '—';
  return `${format(min)} – ${format(max)}`;
}

export function LoanProductsSection({ products, onChanged }: { products: LoanProduct[]; onChanged: () => Promise<void> }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<LoanProduct | 'new' | null>(null);

  const toggle = async (product: LoanProduct) => {
    setBusyId(product.id);
    try {
      if (product.active) {
        await loanProductsApi.deactivate(product.id);
        toast.success(`${product.name ?? 'Product'} deactivated — no new applications can use it.`);
      } else {
        await loanProductsApi.activate(product.id);
        toast.success(`${product.name ?? 'Product'} activated.`);
      }
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update the product.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionCard
      title="Loan products"
      description="Each product sets the amounts, terms and interest a loan can have. Applications outside a product’s limits are rejected."
      enforced
      action={
        <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-1.5 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-3 py-1.5 rounded-lg">
          <PlusIcon size={16} />
          Add loan product
        </button>
      }
    >
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Product</th>
              <th className="px-5 py-2.5 font-medium">Amount</th>
              <th className="px-5 py-2.5 font-medium">Term</th>
              <th className="px-5 py-2.5 font-medium">Interest</th>
              <th className="px-5 py-2.5 font-medium text-right">Available</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-gray-400">
                  No loan products yet.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 text-gray-800 font-medium">
                    {p.name ?? `Product #${p.id}`}
                    {p.shortName && <span className="block text-xs text-gray-400 font-normal">{p.shortName}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-700 tabular-nums whitespace-nowrap">{range(p.minimumPrincipal, p.maximumPrincipal, formatAmount)}</td>
                  <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                    {range(p.minimumLoanTerm, p.maximumLoanTerm)} {p.repaymentFrequencyType?.toLowerCase() ?? ''}
                  </td>
                  <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                    {p.defaultInterestRate == null ? '—' : `${p.defaultInterestRate}%${p.interestRateType ? ` / ${p.interestRateType.toLowerCase()}` : ''}`}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!p.active}
                      aria-label={`${p.name ?? 'Product'} available`}
                      disabled={busyId === p.id}
                      onClick={() => void toggle(p)}
                      className={`relative inline-flex h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${p.active ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${p.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => setEditing(p)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Edit product">
                      <PencilIcon size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LoanProductFormModal product={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
    </SectionCard>
  );
}

/** The raw key/value list — for keys no tab covers. Collapsed by default. */
export function AllSettingsSection({ settings, onChanged }: { settings: Setting[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Setting | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newKey.trim()) return;
    try {
      await settingsApi.create(newKey.trim(), newValue || null);
      toast.success('Setting added.');
      setNewKey('');
      setNewValue('');
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add setting.');
    }
  };

  const handleSave = async (setting: Setting) => {
    try {
      await settingsApi.update(setting.id, edits[setting.id] ?? setting.settingValue ?? '');
      toast.success(`${setting.settingKey} updated.`);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[setting.id];
        return next;
      });
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update setting.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await settingsApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.settingKey} removed.`);
      setDeleteTarget(null);
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove setting.');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div>
          <h3 className="text-sm font-heading font-bold text-gray-800">All stored settings (advanced)</h3>
          <p className="text-xs text-gray-500 mt-1">Every raw key and value, including ones no tab covers. Edit with care.</p>
        </div>
        <ChevronDownIcon size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5">
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 mb-4">
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="New key" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Value" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            <button type="submit" disabled={!newKey.trim()} className="flex items-center justify-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-4 py-2 rounded-lg disabled:opacity-60">
              <PlusIcon size={16} />
              Add
            </button>
          </form>

          <div className="overflow-x-auto -mx-5 max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {settings.map((setting) => (
                  <tr key={setting.id}>
                    <td className="px-5 py-2 text-gray-700 font-mono text-xs align-top pt-3 w-1/3 break-all">{setting.settingKey}</td>
                    <td className="px-2 py-2">
                      <input
                        value={edits[setting.id] ?? setting.settingValue ?? ''}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [setting.id]: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap text-right">
                      <button onClick={() => void handleSave(setting)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Save">
                        <SaveIcon size={16} />
                      </button>
                      <button onClick={() => setDeleteTarget(setting)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                        <TrashIcon size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`Remove ${deleteTarget?.settingKey ?? 'setting'}?`}
        description="This removes the key entirely — anything reading it falls back to its default."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </section>
  );
}
