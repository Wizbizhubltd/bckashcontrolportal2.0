import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { SearchIcon, AlertTriangleIcon } from 'lucide-react';
import { loansApi, type LoanListItem } from '../../api/loansApi';
import { officesApi, type Office } from '../../api/officesApi';
import { Pagination } from '../../components/Pagination';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';

const PAGE_SIZE = 15;

function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

export function LateLoansListPage() {
  const [items, setItems] = useState<LoanListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);

  const [search, setSearch] = useState('');
  const [officeId, setOfficeId] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await loansApi.late({
        search: search || undefined,
        officeId: officeId ? Number(officeId) : undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load late loans.');
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
  }, [search, officeId]);

  const officeName = (id: number | null) => offices.find((o) => o.id === id)?.name ?? '—';

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <AlertTriangleIcon size={20} className="text-red-600" />
        <div>
          <h1 className="text-xl font-heading font-bold text-primary">Late Loans</h1>
          <p className="text-sm text-gray-500 mt-1">Disbursed loans with an installment past due, in the last 12 months, still outstanding.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by account number"
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
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Account No.</th>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Approved Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No late loans found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-medium">{item.accountNumber ?? `#${item.id}`}</td>
                  <td className="px-4 py-3 text-gray-700">{officeName(item.officeId)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(item.approvedAmount)}</td>
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
