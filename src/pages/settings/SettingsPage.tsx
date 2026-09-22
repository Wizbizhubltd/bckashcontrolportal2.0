import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, SaveIcon } from 'lucide-react';
import { settingsApi, type Setting } from '../../api/settingsApi';
import { ConfirmationModal } from '../../components/ConfirmationModal';

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Setting | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.list();
      setSettings(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newKey.trim()) return;
    try {
      await settingsApi.create(newKey.trim(), newValue || null);
      toast.success('Setting added.');
      setNewKey('');
      setNewValue('');
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add setting.');
    }
  };

  const handleSave = async (setting: Setting) => {
    const value = edits[setting.id] ?? setting.settingValue ?? '';
    try {
      await settingsApi.update(setting.id, value);
      toast.success(`${setting.settingKey} updated.`);
      void load();
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
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove setting.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Rules & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">System-wide key/value operating parameters offices run by.</p>
      </div>

      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Setting key (e.g. loan.max_active_per_client)"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Value"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <button type="submit" disabled={!newKey.trim()} className="flex items-center justify-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-4 py-2 rounded-lg disabled:opacity-60">
          <PlusIcon size={16} />
          Add
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : settings.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No settings defined yet.
                </td>
              </tr>
            ) : (
              settings.map((setting) => (
                <tr key={setting.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{setting.settingKey}</td>
                  <td className="px-4 py-3">
                    <input
                      value={edits[setting.id] ?? setting.settingValue ?? ''}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [setting.id]: e.target.value }))}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => void handleSave(setting)} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Save">
                        <SaveIcon size={16} />
                      </button>
                      <button onClick={() => setDeleteTarget(setting)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`Remove ${deleteTarget?.settingKey ?? 'setting'}?`}
        description="This will remove the key entirely — any code or process reading it will fall back to its default behavior."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  );
}
