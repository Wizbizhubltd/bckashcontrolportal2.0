import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HistoryIcon, LoaderIcon } from 'lucide-react';
import { groupsApi, type GroupProfile } from '../../api/groupsApi';
import { PHONE_MAX_DIGITS, sanitizePhoneInput, toLocalPhone } from '../../utils/phone';

const TEXT_KEYS = ['name', 'joinedDate', 'email', 'street', 'ward', 'district', 'region', 'address', 'notes'] as const;
type GroupForm = Record<(typeof TEXT_KEYS)[number] | 'mobile' | 'phone', string>;

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

/**
 * A super admin's edit of any group's details, recorded in the group's audit trail. The office and
 * marketer aren't changed here: "Reassign to a marketer" on the group page moves the members too.
 */
export function GroupFormPage() {
  const navigate = useNavigate();
  const groupId = Number(useParams<{ id: string }>().id);
  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [form, setForm] = useState<GroupForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    groupsApi
      .get(groupId)
      .then((loaded) => {
        setGroup(loaded);
        setForm({
          ...(Object.fromEntries(TEXT_KEYS.map((key) => [key, loaded[key] ?? ''])) as GroupForm),
          mobile: toLocalPhone(loaded.mobile),
          phone: toLocalPhone(loaded.phone),
        });
      })
      .catch(() => setFailed(true));
  }, [groupId]);

  if (failed) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">This group doesn't exist or was deleted.</p>
        <Link to="/clients?tab=groups" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to groups
        </Link>
      </div>
    );
  }

  if (!group || !form) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading…</p>;
  }

  const set = (changes: Partial<GroupForm>) => setForm({ ...form, ...changes });

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('The group needs a name.');
      return;
    }
    setSaving(true);
    const orNull = (value: string) => value.trim() || null;
    try {
      await groupsApi.update(groupId, {
        officeId: group.officeId,
        staffId: group.staffId,
        externalId: group.externalId,
        name: form.name.trim(),
        joinedDate: form.joinedDate || null,
        mobile: form.mobile || null,
        phone: form.phone || null,
        email: orNull(form.email),
        street: orNull(form.street),
        ward: orNull(form.ward),
        district: orNull(form.district),
        region: orNull(form.region),
        address: orNull(form.address),
        notes: orNull(form.notes),
      });
      toast.success('Group updated. The change is in its audit trail.');
      navigate(`/groups/${groupId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The group could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const text = (key: (typeof TEXT_KEYS)[number], label: string, type: 'text' | 'date' | 'email' = 'text') => (
    <Field label={label}>
      <input type={type} className={inputClass} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </Field>
  );
  const phone = (key: 'mobile' | 'phone', label: string) => (
    <Field label={label}>
      <input
        type="tel"
        inputMode="numeric"
        maxLength={PHONE_MAX_DIGITS}
        placeholder="08031234567"
        className={inputClass}
        value={form[key]}
        onChange={(e) => set({ [key]: sanitizePhoneInput(e.target.value) })}
      />
    </Field>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-primary">Edit group</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <HistoryIcon size={14} /> Every change is recorded in the group's audit trail. To move the group to another marketer, use “Reassign to a marketer”.
        </p>
      </div>

      <div className="space-y-8 rounded-xl border border-gray-100 bg-white p-6">
        <Section title="Details">
          {text('name', 'Group name *')}
          {text('joinedDate', 'Joined date', 'date')}
        </Section>

        <Section title="Contact">
          {phone('mobile', 'Mobile')}
          {phone('phone', 'Phone')}
          {text('email', 'Email', 'email')}
        </Section>

        <Section title="Address">
          {text('street', 'Street')}
          {text('ward', 'Ward')}
          {text('district', 'District')}
          {text('region', 'Region')}
          {text('address', 'Meeting address')}
        </Section>

        <label className="block space-y-1">
          <span className="block text-xs font-medium text-gray-600">Notes</span>
          <textarea rows={3} className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
          <button type="button" onClick={() => navigate(`/groups/${groupId}`)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-heading font-bold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {saving && <LoaderIcon size={16} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
