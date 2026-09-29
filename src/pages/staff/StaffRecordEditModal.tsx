import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { LoaderIcon, XIcon } from 'lucide-react';
import { usersApi, type Gender, type StaffUser, type UpdateStaffRecordInput } from '../../api/usersApi';
import { ReusableInputField } from '../../components/ReusableInputField';
import { PHONE_MAX_DIGITS, sanitizePhoneInput, toLocalPhone } from '../../utils/phone';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Unspecified', value: 'Unspecified' },
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

type Form = Record<keyof UpdateStaffRecordInput, string>;

function toForm(staff: StaffUser): Form {
  return {
    email: staff.email,
    firstName: staff.firstName ?? '',
    lastName: staff.lastName ?? '',
    phone: toLocalPhone(staff.phone),
    gender: staff.gender,
    address: staff.address ?? '',
    notes: staff.notes ?? '',
    dateOfBirth: staff.dateOfBirth ?? '',
    nextOfKinName: staff.nextOfKinName ?? '',
    nextOfKinPhone: toLocalPhone(staff.nextOfKinPhone),
    nextOfKinRelationship: staff.nextOfKinRelationship ?? '',
    bankName: staff.bankName ?? '',
    bankAccountNumber: staff.bankAccountNumber ?? '',
    bankAccountName: staff.bankAccountName ?? '',
  };
}

const orNull = (value: string) => value.trim() || null;

/** Super admins edit a staff member's personal and onboarding details. Office, role, class and status keep their own actions. */
export function StaffRecordEditModal({ staff, onClose, onSaved }: { staff: StaffUser; onClose: () => void; onSaved: (updated: StaffUser) => void }) {
  const [form, setForm] = useState<Form>(() => toForm(staff));
  const [saving, setSaving] = useState(false);

  const update = (field: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  const updatePhone = (field: 'phone' | 'nextOfKinPhone') => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: sanitizePhoneInput(event.target.value) }));

  const accountNumberInvalid = form.bankAccountNumber !== '' && !/^\d{10}$/.test(form.bankAccountNumber);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await usersApi.updateRecord(staff.id, {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: orNull(form.phone),
        gender: form.gender as Gender,
        address: orNull(form.address),
        notes: orNull(form.notes),
        dateOfBirth: orNull(form.dateOfBirth),
        nextOfKinName: orNull(form.nextOfKinName),
        nextOfKinPhone: orNull(form.nextOfKinPhone),
        nextOfKinRelationship: orNull(form.nextOfKinRelationship),
        bankName: orNull(form.bankName),
        bankAccountNumber: orNull(form.bankAccountNumber),
        bankAccountName: orNull(form.bankAccountName),
      });
      toast.success('Staff record updated.');
      onSaved(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update the staff record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <XIcon size={18} />
        </button>
        <div>
          <h3 className="text-lg font-heading font-bold text-gray-900">Edit staff record</h3>
          <p className="text-sm text-gray-500 mt-1">Office, role, maker-checker class and account status are changed from their own actions below.</p>
        </div>

        <section className="space-y-4">
          <h4 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest">Personal details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReusableInputField label="First Name" name="firstName" value={form.firstName} onChange={update('firstName')} required />
            <ReusableInputField label="Last Name" name="lastName" value={form.lastName} onChange={update('lastName')} required />
          </div>
          <ReusableInputField label="Email Address" name="email" type="email" value={form.email} onChange={update('email')} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReusableInputField label="Phone" name="phone" type="tel" inputMode="numeric" maxLength={PHONE_MAX_DIGITS} placeholder="08031234567" value={form.phone} onChange={updatePhone('phone')} />
            <ReusableInputField label="Gender" name="gender" as="select" value={form.gender} onChange={update('gender')} options={GENDER_OPTIONS} />
          </div>
          <ReusableInputField label="Address" name="address" as="textarea" value={form.address} onChange={update('address')} />
          <ReusableInputField label="Notes" name="notes" as="textarea" value={form.notes} onChange={update('notes')} />
        </section>

        <section className="space-y-4">
          <h4 className="text-xs font-heading font-bold text-gray-400 uppercase tracking-widest">Onboarding details</h4>
          <ReusableInputField label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ReusableInputField label="Next of Kin" name="nextOfKinName" value={form.nextOfKinName} onChange={update('nextOfKinName')} />
            <ReusableInputField
              label="Next of Kin Phone"
              name="nextOfKinPhone"
              type="tel"
              inputMode="numeric"
              maxLength={PHONE_MAX_DIGITS}
              placeholder="08031234567"
              value={form.nextOfKinPhone}
              onChange={updatePhone('nextOfKinPhone')}
            />
            <ReusableInputField label="Relationship" name="nextOfKinRelationship" value={form.nextOfKinRelationship} onChange={update('nextOfKinRelationship')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ReusableInputField label="Bank" name="bankName" value={form.bankName} onChange={update('bankName')} />
            <ReusableInputField
              label="Account Number"
              name="bankAccountNumber"
              inputMode="numeric"
              maxLength={10}
              value={form.bankAccountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, bankAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              error="Must be 10 digits."
              touched={accountNumberInvalid}
            />
            <ReusableInputField label="Account Name" name="bankAccountName" value={form.bankAccountName} onChange={update('bankAccountName')} />
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.email.trim() || !form.firstName.trim() || !form.lastName.trim() || accountNumberInvalid}
            className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving && <LoaderIcon size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
