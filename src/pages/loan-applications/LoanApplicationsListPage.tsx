import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loanApplicationsApi, type LoanApplicationListItem, type ApprovalStatus } from '../../api/loanApplicationsApi';
import { officesApi, type Office } from '../../api/officesApi';
import { loanProductsApi, type LoanProduct } from '../../api/loanProductsApi';
import { Pagination } from '../../components/Pagination';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';

const PAGE_SIZE = 15;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

export function LoanApplicationsListPage() {
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState<LoanApplicationListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);

  const [officeId, setOfficeId] = useState('');
  const [loanProductId, setLoanProductId] = useState('');
  const [status, setStatus] = useState<ApprovalStatus | ''>((searchParams.get('status') as ApprovalStatus | null) ?? 'Pending');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
    void loanProductsApi.list().then(setProducts).catch(() => undefined);
  }, []);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await loanApplicationsApi.list({
        officeId: officeId ? Number(officeId) : undefined,
        loanProductId: loanProductId ? Number(loanProductId) : undefined,
        status: (status || undefined) as ApprovalStatus | undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load loan applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(1), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId, loanProductId, status]);

  const officeName = (id: number | null) => offices.find((o) => o.id === id)?.name ?? '—';
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Loan Applications</h1>
        <p className="text-sm text-gray-500 mt-1">Applications awaiting a decision, or review by status.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={loanProductId} onChange={(e) => setLoanProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Loan Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as ApprovalStatus | '')} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Declined">Declined</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Loan Product</th>
              <th className="px-4 py-3 font-medium">Amount</th>
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
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No loan applications found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{officeName(item.officeId)}</td>
                  <td className="px-4 py-3 text-gray-700">{productName(item.loanProductId)}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(item.amount)}</td>
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
