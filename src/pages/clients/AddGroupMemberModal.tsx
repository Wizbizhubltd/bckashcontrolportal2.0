import { useEffect, useState } from 'react';
import { AlertCircleIcon, LoaderIcon, SearchIcon, XIcon } from 'lucide-react';
import { clientsApi, type ClientListItem } from '../../api/clientsApi';
import { groupsApi } from '../../api/groupsApi';

const clientName = (c: ClientListItem) => `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.accountNo || `Client #${c.id}`;

/**
 * Finds a client in the group's office by name or BVN and adds them to the group, moving them out of
 * any group they're in now. The server keeps back anyone with an unsettled loan (or a loan application
 * awaiting a decision), defaulters and clients from another office — the reason is shown here.
 */
export function AddGroupMemberModal({
  groupId,
  groupName,
  officeId,
  memberIds,
  onAdded,
  onClose,
}: {
  groupId: number;
  groupName: string;
  officeId: number | null;
  /** Clients already in the group, left out of the results. */
  memberIds: number[];
  onAdded: (name: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<ClientListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
    setError(null);
    if (!search.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      clientsApi
        .list({ search: search.trim(), officeId: officeId ?? undefined, pageSize: 20 })
        .then((page) => !cancelled && setResults(page.items.filter((c) => !memberIds.includes(c.id))))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const add = async () => {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      const result = await groupsApi.bulkMoveClients(groupId, [picked.id]);
      if (result.succeeded === 0) {
        setError(`${clientName(picked)}: ${result.skipped[0]?.reason ?? 'could not be added.'}`);
        return;
      }
      onAdded(clientName(picked));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The client could not be added.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <XIcon size={18} />
        </button>
        <h3 className="text-lg font-heading font-bold text-gray-900">Add member to {groupName}</h3>
        <p className="text-sm font-body text-gray-500 mt-1 mb-4">
          Clients from the group's office only. A client in another group is moved here. Clients with an unsettled loan can't be moved.
        </p>

        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or BVN"
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          {loading && <LoaderIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
        </div>

        <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
          {!search.trim() ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">Type a name or BVN to find a client.</p>
          ) : !loading && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No clients found in this office.</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setPicked(c);
                  setError(null);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm ${picked?.id === c.id ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-medium text-gray-800">{clientName(c)}</span>
                <span className="block text-xs text-gray-400">
                  {c.accountNo ? `A/C ${c.accountNo}` : 'No account no.'}
                  {c.bvn ? ` · BVN ${c.bvn}` : ''}
                  {c.groupName ? ` · in ${c.groupName}` : ''}
                </span>
              </button>
            ))
          )}
        </div>

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircleIcon size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => void add()}
            disabled={!picked || saving}
            className="px-4 py-2 text-sm font-heading font-bold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </div>
    </div>
  );
}
