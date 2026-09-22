import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, LoaderIcon, ShieldCheckIcon } from 'lucide-react';
import { usersApi, USER_TYPE_SLUGS, type CreateStaffInput, type UserClass, type Gender } from '../../api/usersApi';
import { officesApi, type Office } from '../../api/officesApi';
import { ReusableInputField } from '../../components/ReusableInputField';

const USER_TYPE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  controller: 'Controller',
  director: 'Director',
  manager: 'Manager',
  marketer: 'Marketer',
};

const USER_CLASS_OPTIONS: { label: string; value: UserClass }[] = [
  { label: 'Initiator — creates staff/records, awaits approval', value: 'Initiator' },
  { label: 'Authorizer — approves/declines what an Initiator creates', value: 'Authorizer' },
  { label: 'Reviewer — read/oversight only', value: 'Reviewer' },
];

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Unspecified', value: 'Unspecified' },
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

export function StaffFormPage() {
  const [searchParams] = useSearchParams();
  const lockedUserType = searchParams.get('userType') ?? undefined;
  const navigate = useNavigate();

  const [offices, setOffices] = useState<Office[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateStaffInput>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    officeId: undefined,
    userTypeSlug: lockedUserType ?? '',
    userClass: 'Initiator',
    gender: 'Unspecified',
    address: '',
    notes: '',
  });

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  const update = (field: keyof CreateStaffInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await usersApi.create({
        ...form,
        officeId: form.officeId ? Number(form.officeId) : null,
      });
      toast.success(lockedUserType === 'super_admin' ? 'Super admin created.' : 'Staff member created.');
      navigate(lockedUserType === 'super_admin' ? '/super-admins' : '/staff');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create staff member.');
    } finally {
      setSaving(false);
    }
  };

  const backTo = lockedUserType === 'super_admin' ? '/super-admins' : '/staff';

  return (
    <div className="max-w-2xl">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeftIcon size={14} />
        Back
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          {lockedUserType === 'super_admin' && <ShieldCheckIcon size={20} className="text-primary" />}
          <h1 className="text-xl font-heading font-bold text-primary">{lockedUserType === 'super_admin' ? 'Create Super Admin' : 'Add Staff Member'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ReusableInputField label="First Name" name="firstName" value={form.firstName ?? ''} onChange={update('firstName')} />
            <ReusableInputField label="Last Name" name="lastName" value={form.lastName ?? ''} onChange={update('lastName')} />
          </div>

          <ReusableInputField label="Email Address" name="email" type="email" value={form.email} onChange={update('email')} required />

          <div className="grid grid-cols-2 gap-4">
            <ReusableInputField label="Phone" name="phone" value={form.phone ?? ''} onChange={update('phone')} />
            <ReusableInputField label="Gender" name="gender" as="select" value={form.gender ?? ''} onChange={update('gender')} options={GENDER_OPTIONS} />
          </div>

          <ReusableInputField
            label="Office / Branch"
            name="officeId"
            as="select"
            value={form.officeId ? String(form.officeId) : ''}
            onChange={update('officeId')}
            options={offices.map((o) => ({ label: o.name ?? `Office #${o.id}`, value: String(o.id) }))}
          />

          <div className="grid grid-cols-2 gap-4">
            {lockedUserType ? (
              <div className="space-y-1">
                <label className="block text-xs font-body font-medium text-gray-600">Role (user_type)</label>
                <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary font-heading font-bold">
                  {USER_TYPE_LABELS[lockedUserType] ?? lockedUserType}
                </div>
              </div>
            ) : (
              <ReusableInputField
                label="Role (user_type)"
                name="userTypeSlug"
                as="select"
                value={form.userTypeSlug}
                onChange={update('userTypeSlug')}
                options={USER_TYPE_SLUGS.filter((s) => s !== 'super_admin').map((slug) => ({ label: USER_TYPE_LABELS[slug], value: slug }))}
                required
              />
            )}
            <ReusableInputField label="Maker-Checker Class (user_class)" name="userClass" as="select" value={form.userClass} onChange={update('userClass')} options={USER_CLASS_OPTIONS} required />
          </div>

          <ReusableInputField label="Address" name="address" as="textarea" value={form.address ?? ''} onChange={update('address')} />
          <ReusableInputField label="Notes" name="notes" as="textarea" value={form.notes ?? ''} onChange={update('notes')} />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate(backTo)} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.email || !form.userTypeSlug || !form.userClass}
              className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving && <LoaderIcon size={16} className="animate-spin" />}
              {lockedUserType === 'super_admin' ? 'Create Super Admin' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
