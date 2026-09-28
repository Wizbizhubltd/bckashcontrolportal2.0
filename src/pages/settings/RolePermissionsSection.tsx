import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LockIcon, SearchIcon } from 'lucide-react';
import { rolesApi, type Permission, type Role } from '../../api/rolesApi';
import { EnforcementBadge } from './SettingGroupCard';

/**
 * Settings → Roles & Access: which permissions each staff role has. Each tick is a role → permission
 * pair; ticking or unticking saves immediately. Super Admin is locked to every permission.
 */
export function RolePermissionsSection() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void Promise.all([rolesApi.list(), rolesApi.permissions()])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load roles.'))
      .finally(() => setLoading(false));
  }, []);

  const areas = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matching = permissions.filter(
      (p) => !term || p.name.toLowerCase().includes(term) || p.slug.includes(term) || p.description.toLowerCase().includes(term),
    );
    const grouped = new Map<string, Permission[]>();
    for (const p of matching) grouped.set(p.area, [...(grouped.get(p.area) ?? []), p]);
    return [...grouped.entries()];
  }, [permissions, search]);

  const toggle = async (role: Role, permission: Permission) => {
    if (role.locked) return;
    const key = `${role.id}:${permission.slug}`;
    const granted = role.permissions.includes(permission.slug);
    const optimistic = { ...role, permissions: granted ? role.permissions.filter((s) => s !== permission.slug) : [...role.permissions, permission.slug] };
    setRoles((prev) => prev.map((r) => (r.id === role.id ? optimistic : r)));
    setBusy(key);
    try {
      const saved = granted ? await rolesApi.revoke(role.id, permission.slug) : await rolesApi.grant(role.id, permission.slug);
      setRoles((prev) => prev.map((r) => (r.id === role.id ? saved : r)));
      toast.success(`${permission.name} ${granted ? 'removed from' : 'given to'} ${role.name}.`);
    } catch (error) {
      setRoles((prev) => prev.map((r) => (r.id === role.id ? role : r)));
      toast.error(error instanceof Error ? error.message : 'Failed to update the role.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-heading font-bold text-gray-800">Role permissions</h3>
            <EnforcementBadge enforced />
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Tick a permission to let everyone with that role do it; untick to take it away. Changes reach staff within about 15 minutes, or when they next sign in.
            Every change is recorded in the audit trail.
          </p>
        </div>
        <div className="relative">
          <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a permission…"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-6">Loading…</p>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium text-left min-w-[18rem]">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-3 py-2.5 font-medium text-center whitespace-nowrap">
                    <span className="flex items-center justify-center gap-1 text-gray-700">
                      {role.locked && <LockIcon size={12} />}
                      {role.name}
                    </span>
                    <span className="block text-[11px] font-normal text-gray-400">
                      {role.staffCount} staff · {role.permissions.length}/{permissions.length}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areas.map(([area, items]) => (
                <Fragment key={area}>
                  <tr>
                    <td colSpan={roles.length + 1} className="px-5 pt-4 pb-1 text-[11px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      {area}
                    </td>
                  </tr>
                  {items.map((permission) => (
                    <tr key={permission.slug} className="border-t border-gray-50 hover:bg-gray-50/60">
                      <td className="px-5 py-2.5">
                        <span className="block text-gray-800">{permission.name}</span>
                        <span className="block text-xs text-gray-500">{permission.description}</span>
                        <code className="text-[11px] text-gray-400">{permission.slug}</code>
                      </td>
                      {roles.map((role) => {
                        const granted = role.permissions.includes(permission.slug);
                        return (
                          <td key={role.id} className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={granted}
                              disabled={role.locked || busy === `${role.id}:${permission.slug}`}
                              onChange={() => void toggle(role, permission)}
                              aria-label={`${permission.name} for ${role.name}`}
                              title={role.locked ? 'Super Admin always has every permission.' : undefined}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 disabled:opacity-60"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={roles.length + 1} className="px-5 py-6 text-center text-gray-400">
                    No permission matches “{search}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
