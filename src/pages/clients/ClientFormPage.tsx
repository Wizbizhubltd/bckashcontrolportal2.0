import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HistoryIcon, LoaderIcon } from 'lucide-react';
import { clientsApi, type ClientRecord } from '../../api/clientsApi';
import { officesApi, type Office } from '../../api/officesApi';
import { PHONE_MAX_DIGITS, sanitizePhoneInput, toLocalPhone } from '../../utils/phone';
import { loadMarketers } from '../onboarding/AssignmentFields';

type FormKey = Exclude<keyof ClientRecord, 'id' | 'countryId' | 'referredById' | 'officeId' | 'staffId'>;
type ClientForm = Record<FormKey, string> & { officeId: string; staffId: string };

const TEXT_KEYS: FormKey[] = [
  'bvn', 'externalId', 'title', 'firstName', 'middleName', 'lastName', 'incorporationNumber', 'displayName', 'email', 'gender',
  'clientType', 'maritalStatus', 'dob', 'street', 'ward', 'district', 'region', 'address', 'joinedDate', 'occupation', 'postalCode',
  'country', 'state', 'city', 'businessAddress', 'nationality',
];

function toForm(c: ClientRecord): ClientForm {
  const form = Object.fromEntries(TEXT_KEYS.map((key) => [key, c[key] ?? ''])) as ClientForm;
  form.clientType = c.clientType ?? 'Individual';
  form.mobile = toLocalPhone(c.mobile);
  form.phone = toLocalPhone(c.phone);
  form.officeId = c.officeId?.toString() ?? '';
  form.staffId = c.staffId?.toString() ?? '';
  return form;
}

const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

/**
 * A super admin's edit of any client's profile. It isn't held back by the approval lock or an edit
 * privilege, doesn't send an approved client back to pending, and every changed field is recorded in
 * the client's audit trail.
 */
export function ClientFormPage() {
  const navigate = useNavigate();
  const clientId = Number(useParams<{ id: string }>().id);
  const [record, setRecord] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<ClientForm | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [marketers, setMarketers] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    clientsApi
      .record(clientId)
      .then((loaded) => {
        setRecord(loaded);
        setForm(toForm(loaded));
      })
      .catch(() => setFailed(true));
    void officesApi.list().then(setOffices).catch(() => setOffices([]));
  }, [clientId]);

  const officeId = form?.officeId;
  useEffect(() => {
    setMarketers([]);
    if (!officeId) return;
    let cancelled = false;
    loadMarketers(Number(officeId))
      .then((loaded) => !cancelled && setMarketers(loaded))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [officeId]);

  if (failed) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">This client doesn't exist or was deleted.</p>
        <Link to="/clients" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to clients
        </Link>
      </div>
    );
  }

  if (!record || !form) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading…</p>;
  }

  const set = (changes: Partial<ClientForm>) => setForm({ ...form, ...changes });
  const individual = form.clientType === 'Individual';
  const nameMissing = !form.firstName.trim() || (individual && !form.lastName.trim());
  // The assigned marketer may have left the office; keep them listed so the field shows who it is.
  const marketerListed = !form.staffId || marketers.some((m) => String(m.id) === form.staffId);

  const save = async () => {
    if (nameMissing) {
      toast.error(individual ? 'The client needs a first and last name.' : 'The client needs a name.');
      return;
    }
    if (form.bvn && form.bvn.length !== 11) {
      toast.error('A BVN is 11 digits.');
      return;
    }
    setSaving(true);
    const orNull = (value: string) => value.trim() || null;
    const fullName = [form.firstName, individual ? form.middleName : '', individual ? form.lastName : ''].map((p) => p.trim()).filter(Boolean).join(' ');
    try {
      await clientsApi.update(clientId, {
        bvn: orNull(form.bvn),
        countryId: record.countryId,
        referredById: record.referredById,
        officeId: form.officeId ? Number(form.officeId) : null,
        staffId: form.staffId ? Number(form.staffId) : null,
        externalId: orNull(form.externalId),
        title: orNull(form.title),
        firstName: orNull(form.firstName),
        middleName: individual ? orNull(form.middleName) : null,
        lastName: individual ? orNull(form.lastName) : null,
        fullName: fullName || null,
        incorporationNumber: individual ? null : orNull(form.incorporationNumber),
        displayName: orNull(form.displayName) ?? (fullName || null),
        picture: null,
        mobile: form.mobile || null,
        phone: form.phone || null,
        email: orNull(form.email),
        gender: individual ? form.gender || null : null,
        clientType: form.clientType,
        maritalStatus: individual ? form.maritalStatus || null : null,
        dob: individual ? form.dob || null : null,
        street: orNull(form.street),
        ward: orNull(form.ward),
        district: orNull(form.district),
        region: orNull(form.region),
        address: orNull(form.address),
        joinedDate: form.joinedDate || null,
        occupation: orNull(form.occupation),
        postalCode: orNull(form.postalCode),
        country: orNull(form.country),
        state: orNull(form.state),
        city: orNull(form.city),
        businessAddress: orNull(form.businessAddress),
        nationality: orNull(form.nationality),
      });
      toast.success('Client updated. The change is in their audit trail.');
      navigate(`/clients/${clientId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The client could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const text = (key: FormKey, label: string, type: 'text' | 'date' | 'email' = 'text') => (
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
  const select = (key: FormKey, label: string, options: [string, string][]) => (
    <Field label={label}>
      <select className={`${inputClass} bg-white`} value={form[key]} onChange={(e) => set({ [key]: e.target.value })}>
        {options.map(([value, optionLabel]) => (
          <option key={value} value={value}>
            {optionLabel}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-primary">Edit client</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <HistoryIcon size={14} /> Saved straight away, even for an approved client. Every change is recorded in the client's audit trail.
        </p>
      </div>

      <div className="space-y-8 rounded-xl border border-gray-100 bg-white p-6">
        <Section title="Identity">
          {select('clientType', 'Client type', [
            ['Individual', 'Individual'],
            ['Business', 'Business'],
            ['Ngo', 'NGO'],
            ['Other', 'Other'],
          ])}
          {text('title', 'Title')}
          {text('firstName', individual ? 'First name *' : 'Business name *')}
          {individual && text('middleName', 'Middle name')}
          {individual && text('lastName', 'Last name *')}
          {!individual && text('incorporationNumber', 'Incorporation number')}
          {text('displayName', 'Display name')}
          {individual && text('dob', 'Date of birth', 'date')}
          {individual &&
            select('gender', 'Gender', [
              ['', '—'],
              ['Male', 'Male'],
              ['Female', 'Female'],
              ['Other', 'Other'],
            ])}
          {individual &&
            select('maritalStatus', 'Marital status', [
              ['', '—'],
              ['Single', 'Single'],
              ['Married', 'Married'],
              ['Divorced', 'Divorced'],
              ['Widowed', 'Widowed'],
            ])}
          {text('occupation', 'Occupation / type of business')}
          {text('nationality', 'Nationality')}
        </Section>

        <Section title="Contact & KYC">
          <Field label="BVN">
            <input inputMode="numeric" maxLength={11} className={inputClass} value={form.bvn} onChange={(e) => set({ bvn: e.target.value.replace(/\D/g, '').slice(0, 11) })} />
          </Field>
          {phone('mobile', 'Mobile')}
          {phone('phone', 'Phone')}
          {text('email', 'Email', 'email')}
          {text('joinedDate', 'Joined date', 'date')}
          {text('externalId', 'External ID')}
        </Section>

        <Section title="Office & marketer">
          <Field label="Office">
            <select className={`${inputClass} bg-white`} value={form.officeId} onChange={(e) => set({ officeId: e.target.value, staffId: '' })}>
              <option value="">—</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name ?? `Office #${o.id}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Marketer">
            <select className={`${inputClass} bg-white`} value={form.staffId} disabled={!form.officeId} onChange={(e) => set({ staffId: e.target.value })}>
              <option value="">—</option>
              {!marketerListed && <option value={form.staffId}>Current marketer (#{form.staffId})</option>}
              {marketers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Address">
          {text('street', 'Street')}
          {text('ward', 'Ward')}
          {text('district', 'District')}
          {text('region', 'Region')}
          {text('city', 'City')}
          {text('state', 'State')}
          {text('country', 'Country')}
          {text('postalCode', 'Postal code')}
          {text('address', 'Residential address')}
          {text('businessAddress', 'Business address')}
        </Section>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
          <button type="button" onClick={() => navigate(`/clients/${clientId}`)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
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
