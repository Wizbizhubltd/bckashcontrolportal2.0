import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { LoaderIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { zonesApi, type Zone } from '../../api/zonesApi';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { ReusableInputField } from '../../components/ReusableInputField';

interface ZoneForm {
  id: number | null;
  name: string;
  description: string;
}

/** Zones group offices. Only super admins can create, edit or delete them. */
export function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ZoneForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setZones(await zonesApi.list());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load zones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const input = { name: form.name, description: form.description || null };
      if (form.id) {
        await zonesApi.update(form.id, input);
        toast.success('Zone updated.');
      } else {
        await zonesApi.create(input);
        toast.success('Zone created.');
      }
      setForm(null);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save zone.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await zonesApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete zone.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-primary">Zones</h1>
          <p className="text-sm text-gray-500 mt-1">Groups of offices. Only super admins can change zones, and a zone can only be deleted when none of its offices has staff.</p>
        </div>
        {!form && (
          <button onClick={() => setForm({ id: null, name: '', description: '' })} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <PlusIcon size={16} />
            Add Zone
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 mb-4 space-y-4 max-w-xl">
          <h2 className="text-sm font-heading font-bold text-gray-700">{form.id ? 'Edit zone' : 'New zone'}</h2>
          <ReusableInputField label="Name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <ReusableInputField label="Description" name="description" as="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setForm(null)} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.name.trim()} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg disabled:opacity-60">
              {saving && <LoaderIcon size={16} className="animate-spin" />}
              {form.id ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Offices</th>
                <th className="px-4 py-3 font-medium text-right">Staff</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No zones yet.</td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{zone.name}</td>
                    <td className="px-4 py-3 text-gray-600">{zone.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-right tabular-nums">{zone.officeCount}</td>
                    <td className="px-4 py-3 text-gray-700 text-right tabular-nums">{zone.staffCount}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {zone.createdByName ?? '—'}
                      {zone.createdAt && <span className="block text-xs text-gray-400">{new Date(zone.createdAt).toLocaleDateString()}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setForm({ id: zone.id, name: zone.name, description: zone.description ?? '' })} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit">
                          <PencilIcon size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(zone)}
                          disabled={zone.staffCount > 0}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                          title={zone.staffCount > 0 ? 'Zones whose offices have staff cannot be deleted' : 'Delete'}
                        >
                          <Trash2Icon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete ${deleteTarget?.name ?? 'zone'}?`}
        description={
          deleteTarget && deleteTarget.officeCount > 0
            ? `Its ${deleteTarget.officeCount} office(s) will be left without a zone and will need a new one the next time they're edited.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
