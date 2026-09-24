import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, LoaderIcon, PlusIcon } from 'lucide-react';
import { officesApi, type Office, type SaveOfficeInput } from '../../api/officesApi';
import { locationsApi } from '../../api/locationsApi';
import { ReusableInputField } from '../../components/ReusableInputField';
import { useLocationOptions } from '../../hooks/useLocationOptions';

interface OfficeForm {
  name: string;
  parentId: string;
  address: string;
  phone: string;
  email: string;
  openingDate: string;
  notes: string;
  defaultOffice: boolean;
  stateId: string;
  lgaId: string;
  cityId: string;
  zoneId: string;
}

const emptyForm: OfficeForm = {
  name: '',
  parentId: '',
  address: '',
  phone: '',
  email: '',
  openingDate: '',
  notes: '',
  defaultOffice: false,
  stateId: '',
  lgaId: '',
  cityId: '',
  zoneId: '',
};

const toId = (value: string) => (value ? Number(value) : undefined);

export function OfficeFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState<OfficeForm>(emptyForm);
  const [officeCode, setOfficeCode] = useState<string | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [newCityName, setNewCityName] = useState<string | null>(null);
  const [addingCity, setAddingCity] = useState(false);

  const { states, lgas, cities, zones, reloadCities } = useLocationOptions(toId(form.stateId), toId(form.lgaId));

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    void (async () => {
      try {
        const office = await officesApi.get(Number(id));
        setOfficeCode(office.officeCode);
        setForm({
          name: office.name ?? '',
          parentId: office.parentId ? String(office.parentId) : '',
          address: office.address ?? '',
          phone: office.phone ?? '',
          email: office.email ?? '',
          openingDate: office.openingDate ?? '',
          notes: office.notes ?? '',
          defaultOffice: office.defaultOffice,
          stateId: office.stateId ? String(office.stateId) : '',
          lgaId: office.lgaId ? String(office.lgaId) : '',
          cityId: office.cityId ? String(office.cityId) : '',
          zoneId: office.zoneId ? String(office.zoneId) : '',
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load office.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const update = (field: keyof OfficeForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // A changed state invalidates the LGA and city under it; a changed LGA invalidates the city.
      if (field === 'stateId') {
        next.lgaId = '';
        next.cityId = '';
      }
      if (field === 'lgaId') next.cityId = '';
      return next;
    });
    if (field === 'lgaId') setNewCityName(null);
  };

  const addCity = async () => {
    if (!form.lgaId || !newCityName?.trim()) return;
    setAddingCity(true);
    try {
      const city = await locationsApi.createCity({ lgaId: Number(form.lgaId), name: newCityName.trim() });
      await reloadCities();
      setForm((prev) => ({ ...prev, cityId: String(city.id) }));
      setNewCityName(null);
      toast.success(`${city.name} added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add city.');
    } finally {
      setAddingCity(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: SaveOfficeInput = {
        name: form.name,
        parentId: toId(form.parentId) ?? null,
        address: form.address,
        phone: form.phone,
        email: form.email,
        openingDate: form.openingDate || null,
        notes: form.notes,
        defaultOffice: form.defaultOffice,
        stateId: toId(form.stateId),
        lgaId: toId(form.lgaId),
        cityId: toId(form.cityId),
        zoneId: toId(form.zoneId),
      };
      if (isEdit) {
        await officesApi.update(Number(id), payload);
        toast.success('Office updated.');
        navigate(`/offices/${id}`);
      } else {
        const created = await officesApi.create(payload);
        toast.success(`Office created with code ${created.officeCode}.`);
        navigate(`/offices/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save office.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading…</div>;
  }

  const locationComplete = !!(form.stateId && form.lgaId && form.cityId && form.zoneId);

  return (
    <div className="max-w-2xl">
      <Link to={isEdit ? `/offices/${id}` : '/offices'} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeftIcon size={14} />
        {isEdit ? 'Back to office' : 'Back to Office Directory'}
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-xl font-heading font-bold text-primary">{isEdit ? 'Edit Office' : 'New Office / Branch'}</h1>
          {isEdit && officeCode && <span className="font-mono text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">{officeCode}</span>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ReusableInputField label="Office Name" name="name" value={form.name} onChange={update('name')} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReusableInputField
              label="State"
              name="stateId"
              as="select"
              value={form.stateId}
              onChange={update('stateId')}
              options={states.map((s) => ({ label: s.name, value: String(s.id) }))}
              required
            />
            <ReusableInputField
              label="Local Government Area"
              name="lgaId"
              as="select"
              value={form.lgaId}
              onChange={update('lgaId')}
              options={lgas.map((l) => ({ label: l.name, value: String(l.id) }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <ReusableInputField
                label="City"
                name="cityId"
                as="select"
                value={form.cityId}
                onChange={update('cityId')}
                options={cities.map((c) => ({ label: c.name, value: String(c.id) }))}
                required
              />
              {form.lgaId && newCityName === null && (
                <button type="button" onClick={() => setNewCityName('')} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <PlusIcon size={12} />
                  City not listed? Add it
                </button>
              )}
              {newCityName !== null && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addCity();
                      }
                    }}
                    placeholder="New city name"
                    autoFocus
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => void addCity()}
                    disabled={addingCity || !newCityName.trim()}
                    className="px-3 py-1.5 text-xs font-heading font-bold text-white bg-primary rounded-lg disabled:opacity-60"
                  >
                    Add
                  </button>
                  <button type="button" onClick={() => setNewCityName(null)} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <ReusableInputField
              label="Zone"
              name="zoneId"
              as="select"
              value={form.zoneId}
              onChange={update('zoneId')}
              options={zones.map((z) => ({ label: z.name, value: String(z.id) }))}
              required
            />
          </div>
          {zones.length === 0 && (
            <p className="text-xs text-gray-500 -mt-2">
              No zones exist yet. <Link to="/zones" className="text-primary hover:underline">Create a zone</Link> first.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReusableInputField
              label="Parent Office"
              name="parentId"
              as="select"
              value={form.parentId}
              onChange={update('parentId')}
              options={offices.filter((o) => String(o.id) !== id).map((o) => ({ label: o.name ?? `Office #${o.id}`, value: String(o.id) }))}
            />
            <ReusableInputField label="Opening Date" name="openingDate" type="date" value={form.openingDate} onChange={update('openingDate')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReusableInputField label="Phone" name="phone" value={form.phone} onChange={update('phone')} />
            <ReusableInputField label="Email" name="email" type="email" value={form.email} onChange={update('email')} />
          </div>

          <ReusableInputField label="Address" name="address" as="textarea" value={form.address} onChange={update('address')} />
          <ReusableInputField label="Notes" name="notes" as="textarea" value={form.notes} onChange={update('notes')} />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.defaultOffice}
              onChange={(e) => setForm((prev) => ({ ...prev, defaultOffice: e.target.checked }))}
              className="rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            Set as head office (default)
          </label>

          {!isEdit && <p className="text-xs text-gray-500">An office code (e.g. BCK453-324-61) is generated automatically when the office is created.</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate(isEdit ? `/offices/${id}` : '/offices')} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name || !locationComplete}
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
