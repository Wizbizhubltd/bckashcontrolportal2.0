import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, LoaderIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { officesApi, type Office, type SaveOfficeInput } from '../../api/officesApi';
import { ReusableInputField } from '../../components/ReusableInputField';

const emptyForm: SaveOfficeInput = {
  name: '',
  parentId: undefined,
  address: '',
  phone: '',
  email: '',
  openingDate: '',
  notes: '',
  defaultOffice: false,
};

export function OfficeFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState<SaveOfficeInput>(emptyForm);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    void (async () => {
      try {
        const office = await officesApi.get(Number(id));
        setForm({
          name: office.name ?? '',
          parentId: office.parentId ?? undefined,
          address: office.address ?? '',
          phone: office.phone ?? '',
          email: office.email ?? '',
          openingDate: office.openingDate ?? '',
          notes: office.notes ?? '',
          defaultOffice: office.defaultOffice,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load office.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const update = (field: keyof SaveOfficeInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: SaveOfficeInput = {
        ...form,
        parentId: form.parentId ? Number(form.parentId) : null,
      };
      if (isEdit) {
        await officesApi.update(Number(id), payload);
        toast.success('Office updated.');
      } else {
        await officesApi.create(payload);
        toast.success('Office created.');
      }
      navigate('/offices');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save office.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <Link to="/offices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeftIcon size={14} />
        Back to Office Directory
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h1 className="text-xl font-heading font-bold text-primary mb-6">{isEdit ? 'Edit Office' : 'New Office / Branch'}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ReusableInputField label="Office Name" name="name" value={form.name} onChange={update('name')} required />

          <div className="grid grid-cols-2 gap-4">
            <ReusableInputField
              label="Parent Office"
              name="parentId"
              as="select"
              value={form.parentId ? String(form.parentId) : ''}
              onChange={update('parentId')}
              options={offices.map((o) => ({ label: o.name ?? `Office #${o.id}`, value: String(o.id) }))}
            />
            <ReusableInputField label="Opening Date" name="openingDate" type="date" value={form.openingDate ?? ''} onChange={update('openingDate')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ReusableInputField label="Phone" name="phone" value={form.phone ?? ''} onChange={update('phone')} />
            <ReusableInputField label="Email" name="email" type="email" value={form.email ?? ''} onChange={update('email')} />
          </div>

          <ReusableInputField label="Address" name="address" as="textarea" value={form.address ?? ''} onChange={update('address')} />
          <ReusableInputField label="Notes" name="notes" as="textarea" value={form.notes ?? ''} onChange={update('notes')} />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form.defaultOffice}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultOffice: e.target.checked }))}
              className="rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            Set as head office (default)
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/offices')} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name}
              className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving && <LoaderIcon size={16} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Office'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
