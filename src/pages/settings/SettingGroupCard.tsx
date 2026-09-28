import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDownIcon, LoaderIcon } from 'lucide-react';
import { settingsApi, type Setting } from '../../api/settingsApi';
import { isOn, type SettingField, type SettingGroup } from './settingsCatalog';

export function EnforcementBadge({ enforced }: { enforced: boolean }) {
  return enforced ? (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Enforced</span>
  ) : (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
      title="The value is saved, but the system doesn't act on it yet."
    >
      Not enforced yet
    </span>
  );
}

const inputClasses = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none';

function FieldControl({ field, value, onChange }: { field: SettingField; value: string; onChange: (value: string) => void }) {
  switch (field.type) {
    case 'toggle': {
      const on = isOn(value);
      return (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={field.label}
          onClick={() => onChange(on ? '0' : '1')}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      );
    }
    case 'number':
      return (
        <div className="flex items-center gap-2">
          <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClasses} w-24`} />
          {field.unit && <span className="text-sm text-gray-500 whitespace-nowrap">{field.unit}</span>}
        </div>
      );
    case 'select':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses}>
          <option value="">Not set</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'textarea':
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className={`${inputClasses} font-mono text-xs`} />;
    case 'secret':
      return <input type="password" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;
    default:
      return <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;
  }
}

interface SettingGroupCardProps {
  group: SettingGroup;
  settingsByKey: Map<string, Setting>;
  onSaved: () => Promise<void>;
}

/** One card of related settings with its own Save — only the fields actually changed are written. */
export function SettingGroupCard({ group, settingsByKey, onSaved }: SettingGroupCardProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(!group.collapsible);

  const stored = (key: string) => settingsByKey.get(key)?.settingValue ?? '';
  const dirtyKeys = Object.keys(drafts).filter((key) => drafts[key] !== stored(key));

  const save = async () => {
    setSaving(true);
    try {
      for (const key of dirtyKeys) {
        const existing = settingsByKey.get(key);
        if (existing) {
          await settingsApi.update(existing.id, drafts[key]);
        } else {
          await settingsApi.create(key, drafts[key]);
        }
      }
      await onSaved();
      setDrafts({});
      toast.success(`${group.title} saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRows = group.fields.every((f) => f.type === 'toggle');
  // A group with some enforced fields and some not shows the badge per field instead.
  const mixed = !group.enforced && group.fields.some((f) => f.enforced) && group.fields.some((f) => !f.enforced);

  return (
    <section className="bg-white rounded-xl border border-gray-100">
      <div
        className={`flex items-start justify-between gap-3 p-5 ${group.collapsible ? 'cursor-pointer' : ''}`}
        onClick={group.collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-heading font-bold text-gray-800">{group.title}</h3>
            {!mixed && <EnforcementBadge enforced={!!group.enforced || group.fields.every((f) => f.enforced)} />}
          </div>
          {group.description && <p className="text-xs text-gray-500 mt-1">{group.description}</p>}
        </div>
        {group.collapsible && <ChevronDownIcon size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </div>

      {open && (
        <div className="px-5 pb-5">
          <div className={toggleRows ? 'divide-y divide-gray-100 border-t border-gray-100' : 'space-y-4'}>
            {group.fields.map((field) => {
              const value = drafts[field.key] ?? stored(field.key);
              const control = <FieldControl field={field} value={value} onChange={(v) => setDrafts((prev) => ({ ...prev, [field.key]: v }))} />;

              return field.type === 'toggle' ? (
                <div key={field.key} className={`flex items-center justify-between gap-4 ${toggleRows ? 'py-3' : ''}`}>
                  <div>
                    <p className="text-sm text-gray-800 flex items-center gap-2 flex-wrap">
                      {field.label}
                      {mixed && <EnforcementBadge enforced={!!field.enforced} />}
                    </p>
                    {field.help && <p className="text-xs text-gray-500 mt-0.5">{field.help}</p>}
                  </div>
                  {control}
                </div>
              ) : (
                <label key={field.key} className="block">
                  <span className="flex items-center gap-2 flex-wrap text-sm text-gray-800 mb-1">
                    {field.label}
                    {mixed && <EnforcementBadge enforced={!!field.enforced} />}
                  </span>
                  {control}
                  {field.help && <span className="block text-xs text-gray-500 mt-1">{field.help}</span>}
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            {dirtyKeys.length > 0 && (
              <button type="button" onClick={() => setDrafts({})} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || dirtyKeys.length === 0}
              className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-4 py-1.5 rounded-lg disabled:opacity-50"
            >
              {saving && <LoaderIcon size={14} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
