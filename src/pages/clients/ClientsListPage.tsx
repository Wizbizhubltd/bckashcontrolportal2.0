import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SearchIcon } from 'lucide-react';
import { clientsApi, type ClientListItem, type ClientStatus } from '../../api/clientsApi';
import { officesApi, type Office } from '../../api/officesApi';
import { Pagination } from '../../components/Pagination';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';

const PAGE_SIZE = 15;

export function ClientsListPage() {
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState<ClientListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);

  const [search, setSearch] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [status, setStatus] = useState((searchParams.get('status') as ClientStatus | null) ?? '');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await clientsApi.list({
        search: search || undefined,
        officeId: officeId ? Number(officeId) : undefined,
        status: (status || undefined) as ClientStatus | undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(1), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, officeId, status]);

  const officeName = (id: number | null) => offices.find((o) => o.id === id)?.name ?? '—';

  // `displayName`/`fullName` are legacy denormalized columns that are blank on real imported
  // data — the name shown here is always built from firstName/lastName directly, never that
  // stored (unreliable) value.
  const clientName = (item: ClientListItem) => `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.accountNo || `Client #${item.id}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Every client account across the network.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Declined">Declined</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Account No.</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No clients found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-medium">{item.accountNo ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{clientName(item)}</td>
                  <td className="px-4 py-3 text-gray-700">{item.mobile || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{officeName(item.officeId)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status as StatusType} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={(p) => void load(p)} />
      </div>
    </div>
  );
}
