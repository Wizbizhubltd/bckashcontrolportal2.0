import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, LoaderIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react';
import { locationsApi, type City } from '../../api/locationsApi';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { useLocationOptions } from '../../hooks/useLocationOptions';

const selectClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-50 disabled:text-gray-400';

/** States and LGAs are fixed; super admins add the cities under each LGA that offices can then use. */
export function CitiesPage() {
  const [stateId, setStateId] = useState('');
  const [lgaId, setLgaId] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<City | null>(null);

  const { states, lgas, cities, reloadCities } = useLocationOptions(stateId ? Number(stateId) : undefined, lgaId ? Number(lgaId) : undefined);

  const addCity = async (event: FormEvent) => {
    event.preventDefault();
    if (!lgaId || !newName.trim()) return;
    setAdding(true);
    try {
      const city = await locationsApi.createCity({ lgaId: Number(lgaId), name: newName.trim() });
      toast.success(`${city.name} added.`);
      setNewName('');
      void reloadCities();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add city.');
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (city: City) => {
    if (!editing?.name.trim()) return;
    try {
      await locationsApi.updateCity(city.id, { lgaId: city.lgaId, name: editing.name.trim() });
      toast.success('City renamed.');
      setEditing(null);
      void reloadCities();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename city.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await locationsApi.deleteCity(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted.`);
      void reloadCities();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete city.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Cities</h1>
        <p className="text-sm text-gray-500 mt-1">All states and local government areas are built in. Add the cities under each LGA that offices can be located in. Only super admins can change this list.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <select
            aria-label="State"
            value={stateId}
            onChange={(e) => {
              setStateId(e.target.value);
              setLgaId('');
            }}
            className={selectClass}
          >
            <option value="">Select a state</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select aria-label="LGA" value={lgaId} onChange={(e) => setLgaId(e.target.value)} disabled={!stateId} className={selectClass}>
            <option value="">{stateId ? 'All LGAs in this state' : 'Pick a state first'}</option>
            {lgas.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {lgaId && (
          <form onSubmit={addCity} className="flex flex-wrap gap-2 max-w-2xl">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`New city in ${lgas.find((l) => String(l.id) === lgaId)?.name ?? 'this LGA'}`}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <button type="submit" disabled={adding || !newName.trim()} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60">
              {adding && <LoaderIcon size={14} className="animate-spin" />}
              Add City
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">LGA</th>
                <th className="px-4 py-3 font-medium text-right">Offices</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!stateId ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Select a state to see its cities.</td>
                </tr>
              ) : cities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">{lgaId ? 'No cities in this LGA yet.' : 'No cities in this state yet. Pick an LGA to add one.'}</td>
                </tr>
              ) : (
                cities.map((city) => (
                  <tr key={city.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {editing?.id === city.id ? (
                        <input
                          value={editing.name}
                          onChange={(e) => setEditing({ id: city.id, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveEdit(city);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          autoFocus
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        city.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{city.lgaName}</td>
                    <td className="px-4 py-3 text-gray-700 text-right tabular-nums">{city.officeCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {editing?.id === city.id ? (
                          <>
                            <button onClick={() => void saveEdit(city)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Save">
                              <CheckIcon size={16} />
                            </button>
                            <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Cancel">
                              <XIcon size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditing({ id: city.id, name: city.name })} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg" title="Rename">
                              <PencilIcon size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(city)}
                              disabled={city.officeCount > 0}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                              title={city.officeCount > 0 ? 'Cities used by offices cannot be deleted' : 'Delete'}
                            >
                              <Trash2Icon size={16} />
                            </button>
                          </>
                        )}
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
        title={`Delete ${deleteTarget?.name ?? 'city'}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
