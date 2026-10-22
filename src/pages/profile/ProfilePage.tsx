import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BadgeCheckIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, LandmarkIcon, LoaderIcon, UserIcon, UsersIcon, type LucideIcon } from 'lucide-react';
import { usersApi, type Bank, type Gender, type StaffUser, type UpdateProfileInput } from '../../api/usersApi';
import { useAuth } from '../../context/AuthContext';
import { SIGNED_OUT_REASON_KEY } from '../../config/storageKeys';
import { ReusableInputField } from '../../components/ReusableInputField';
import { humanize, initials } from '../../utils/format';
import { PHONE_MAX_DIGITS, sanitizePhoneInput, toLocalPhone } from '../../utils/phone';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

const RELATIONSHIP_OPTIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Relative', 'Friend', 'Other'].map((r) => ({ label: r, value: r }));

const ACCOUNT_NUMBER_DIGITS = 10;
const MIN_PASSWORD_LENGTH = 8;

type FormState = Record<keyof UpdateProfileInput, string>;

function toForm(me: StaffUser): FormState {
  return {
    firstName: me.firstName ?? '',
    lastName: me.lastName ?? '',
    phone: toLocalPhone(me.phone),
    gender: me.gender === 'Unspecified' ? '' : me.gender,
    address: me.address ?? '',
    dateOfBirth: me.dateOfBirth ?? '',
    nextOfKinName: me.nextOfKinName ?? '',
    nextOfKinPhone: toLocalPhone(me.nextOfKinPhone),
    nextOfKinRelationship: me.nextOfKinRelationship ?? '',
    bankName: me.bankName ?? '',
    bankAccountNumber: me.bankAccountNumber ?? '',
    bankAccountName: me.bankAccountName ?? '',
  };
}

/**
 * The signed-in super admin's own record — personal details, next of kin and bank — and changing their
 * password. A changed password signs them out so they sign in again with it.
 */
export function ProfilePage() {
  const { updateUser } = useAuth();
  const [me, setMe] = useState<StaffUser | null>(null);
  const [failed, setFailed] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi
      .me()
      .then((loaded) => {
        setMe(loaded);
        setForm(toForm(loaded));
      })
      .catch(() => setFailed(true));
    void usersApi.banks().then(setBanks).catch(() => undefined);
  }, []);

  const bankOptions = useMemo(() => banks.map((b) => ({ label: b.name, value: b.name })), [banks]);

  if (failed) return <p className="py-16 text-center text-sm text-gray-400">Couldn't load your profile. Refresh the page to try again.</p>;
  if (!me || !form) {
    return (
      <div className="flex justify-center py-16 text-gray-400">
        <LoaderIcon size={20} className="animate-spin" />
      </div>
    );
  }

  const fullName = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email;
  const set = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => (prev ? { ...prev, [field]: event.target.value } : prev));
  const setPhone = (field: 'phone' | 'nextOfKinPhone') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => (prev ? { ...prev, [field]: sanitizePhoneInput(event.target.value) } : prev));
  const accountNumberInvalid = form.bankAccountNumber.length > 0 && form.bankAccountNumber.length !== ACCOUNT_NUMBER_DIGITS;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (accountNumberInvalid) {
      toast.error(`Bank account number must be ${ACCOUNT_NUMBER_DIGITS} digits.`);
      return;
    }

    setSaving(true);
    try {
      const orNull = (value: string) => value.trim() || null;
      const updated = await usersApi.updateMyProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: orNull(form.phone),
        gender: (form.gender || 'Unspecified') as Gender,
        address: orNull(form.address),
        dateOfBirth: orNull(form.dateOfBirth),
        nextOfKinName: orNull(form.nextOfKinName),
        nextOfKinPhone: orNull(form.nextOfKinPhone),
        nextOfKinRelationship: orNull(form.nextOfKinRelationship),
        bankName: orNull(form.bankName),
        bankAccountNumber: orNull(form.bankAccountNumber),
        bankAccountName: orNull(form.bankAccountName),
      });
      setMe(updated);
      setForm(toForm(updated));
      updateUser({ fullName: [updated.firstName, updated.lastName].filter(Boolean).join(' '), phoneNumber: updated.phone });
      toast.success('Profile saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <aside className="space-y-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 font-heading text-xl font-bold text-primary">
              {initials(fullName) || <UserIcon size={24} />}
            </div>
            <h2 className="mt-3 font-heading text-lg font-bold text-gray-900">{fullName}</h2>
            <p className="text-sm text-gray-500">{me.email}</p>
          </div>
          <dl className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-sm">
            <Row label="Role" value={humanize(me.userType)} />
            <Row label="User class" value={me.userClass ?? '—'} />
            <Row label="Last sign-in" value={me.lastLogin ? new Date(me.lastLogin).toLocaleString('en-NG') : '—'} />
            <Row label="Password changed" value={me.passwordChangedAt ? new Date(me.passwordChangedAt).toLocaleString('en-NG') : '—'} />
          </dl>
          <p className="mt-4 text-xs text-gray-400">Your email and role can only be changed by another super admin.</p>
        </section>

        <ChangePasswordCard />
      </aside>

      <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2" noValidate>
        <FormSection icon={UserIcon} title="Personal details">
          <ReusableInputField label="First name" name="firstName" value={form.firstName} onChange={set('firstName')} required />
          <ReusableInputField label="Last name" name="lastName" value={form.lastName} onChange={set('lastName')} required />
          <ReusableInputField label="Phone" name="phone" type="tel" inputMode="numeric" maxLength={PHONE_MAX_DIGITS} placeholder="08031234567" value={form.phone} onChange={setPhone('phone')} />
          <ReusableInputField label="Gender" name="gender" as="select" value={form.gender} onChange={set('gender')} options={GENDER_OPTIONS} />
          <ReusableInputField label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          <div className="sm:col-span-2">
            <ReusableInputField label="Residential address" name="address" as="textarea" rows={2} value={form.address} onChange={set('address')} />
          </div>
        </FormSection>

        <FormSection icon={UsersIcon} title="Next of kin">
          <ReusableInputField label="Full name" name="nextOfKinName" value={form.nextOfKinName} onChange={set('nextOfKinName')} />
          <ReusableInputField label="Relationship" name="nextOfKinRelationship" as="select" value={form.nextOfKinRelationship} onChange={set('nextOfKinRelationship')} options={RELATIONSHIP_OPTIONS} />
          <ReusableInputField
            label="Phone"
            name="nextOfKinPhone"
            type="tel"
            inputMode="numeric"
            maxLength={PHONE_MAX_DIGITS}
            placeholder="08031234567"
            value={form.nextOfKinPhone}
            onChange={setPhone('nextOfKinPhone')}
          />
        </FormSection>

        <FormSection icon={LandmarkIcon} title="Bank account">
          <ReusableInputField label="Bank" name="bankName" as="select" value={form.bankName} onChange={set('bankName')} options={bankOptions} />
          <ReusableInputField
            label="Account number"
            name="bankAccountNumber"
            inputMode="numeric"
            maxLength={ACCOUNT_NUMBER_DIGITS}
            placeholder="0123456789"
            value={form.bankAccountNumber}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, bankAccountNumber: e.target.value.replace(/\D/g, '').slice(0, ACCOUNT_NUMBER_DIGITS) } : prev))}
            error={`Must be ${ACCOUNT_NUMBER_DIGITS} digits.`}
            touched={accountNumberInvalid}
          />
          <div className="sm:col-span-2">
            <ReusableInputField label="Account name" name="bankAccountName" value={form.bankAccountName} onChange={set('bankAccountName')} />
          </div>
        </FormSection>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-heading font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? <LoaderIcon size={16} className="animate-spin" /> : <BadgeCheckIcon size={16} />}
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}

/** Current password, then the new one twice. On success the user is signed out to sign in with it. */
function ChangePasswordCard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const problem = !current
    ? 'Enter your current password.'
    : next.length < MIN_PASSWORD_LENGTH
      ? `The new password needs at least ${MIN_PASSWORD_LENGTH} characters.`
      : next === current
        ? 'The new password must be different from the current one.'
        : next !== confirm
          ? "The new passwords don't match."
          : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await usersApi.changeMyPassword(current, next);
      sessionStorage.setItem(SIGNED_OUT_REASON_KEY, 'Your password was changed. Sign in with your new password.');
      logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Your password could not be changed.');
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';
  const type = show ? 'text' : 'password';

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6" noValidate>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRoundIcon size={16} />
        </span>
        <div>
          <h3 className="font-heading text-sm font-semibold text-gray-800">Change password</h3>
          <p className="text-xs text-gray-400">You'll be signed out to sign in with the new one.</p>
        </div>
      </div>
      <label className="block space-y-1">
        <span className="block text-xs font-medium text-gray-600">Current password</span>
        <input type={type} autoComplete="current-password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="block text-xs font-medium text-gray-600">New password</span>
        <input type={type} autoComplete="new-password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="block text-xs text-gray-400">At least {MIN_PASSWORD_LENGTH} characters.</span>
      </label>
      <label className="block space-y-1">
        <span className="block text-xs font-medium text-gray-600">Confirm new password</span>
        <input type={type} autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary">
          {show ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
          {show ? 'Hide passwords' : 'Show passwords'}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-heading font-bold text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {saving && <LoaderIcon size={16} className="animate-spin" />}
          Change password
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-700">{value}</dd>
    </div>
  );
}

function FormSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} />
        </span>
        <h3 className="font-heading text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
