import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { rolesApi, type PortalModule, type Role } from '../../api/rolesApi';
import { EnforcementBadge } from './SettingGroupCard';

/**
 * Settings → Roles & Access: which office-portal modules each staff role can open. Each tick saves
 * immediately. Super admins use this portal, not the office portal, so they aren't listed.
 */
export function RoleModulesSection() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<PortalModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([rolesApi.list(), rolesApi.modules()])
      .then(([r, m]) => {
        setRoles(r.filter((role) => !role.locked));
        setModules(m);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load office portal modules.'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (role: Role, module: PortalModule) => {
    const key = `${role.id}:${module.slug}`;
    const ticked = role.modules.includes(module.slug);
    const optimistic = { ...role, modules: ticked ? role.modules.filter((s) => s !== module.slug) : [...role.modules, module.slug] };
    setRoles((prev) => prev.map((r) => (r.id === role.id ? optimistic : r)));
    setBusy(key);
    try {
      const saved = ticked ? await rolesApi.untickModule(role.id, module.slug) : await rolesApi.tickModule(role.id, module.slug);
      setRoles((prev) => prev.map((r) => (r.id === role.id ? saved : r)));
      toast.success(`${module.name} ${ticked ? 'removed from' : 'given to'} ${role.name}.`);
    } catch (error) {
      setRoles((prev) => prev.map((r) => (r.id === role.id ? role : r)));
      toast.error(error instanceof Error ? error.message : 'Failed to update the role.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-heading font-bold text-gray-800">Office portal modules</h3>
          <EnforcementBadge enforced />
        </div>
        <p className="text-xs text-gray-500 mt-1 max-w-2xl">
          Tick the modules each staff role can open in the Office Portal. Staff see the change the next time the portal loads. A module only shows
          what the role's permissions below allow it to do, so give the role the matching permissions too.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-6">Loading…</p>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium text-left min-w-[18rem]">Module</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-3 py-2.5 font-medium text-center whitespace-nowrap text-gray-700">
                    {role.name}
                    <span className="block text-[11px] font-normal text-gray-400">
                      {role.modules.length}/{modules.length} modules
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.slug} className="border-t border-gray-50 hover:bg-gray-50/60">
                  <td className="px-5 py-2.5">
                    <span className="block text-gray-800">{module.name}</span>
                    <span className="block text-xs text-gray-500">{module.description}</span>
                  </td>
                  {roles.map((role) => (
                    <td key={role.id} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={role.modules.includes(module.slug)}
                        disabled={busy === `${role.id}:${module.slug}`}
                        onChange={() => void toggle(role, module)}
                        aria-label={`${module.name} for ${role.name}`}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 disabled:opacity-60"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
