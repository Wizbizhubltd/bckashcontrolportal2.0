import { useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { clientsApi, type ClientListItem } from '../../api/clientsApi';
import { loansApi, type LoanListItem } from '../../api/loansApi';
import { usersApi, type StaffActivity } from '../../api/usersApi';
import type { PagedResult } from '../../api/types';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { formatMoney } from '../../utils/money';

const PAGE_SIZE = 10;


function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

/** Loads one page at a time for a tab; reloads when the staff member changes. */
function usePagedTab<T>(fetchPage: (page: number) => Promise<PagedResult<T>>, staffId: number, errorMessage: string) {
  const [data, setData] = useState<PagedResult<T> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (page: number) => {
    setLoading(true);
    try {
      setData(await fetchPage(page));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  return { data, loading, load };
}

function TabTable({ headers, loading, empty, children }: { headers: string[]; loading: boolean; empty: string; children: ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400">
                Loading…
              </td>
            </tr>
          ) : children.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StaffClientsTab({ staffId }: { staffId: number }) {
  const { data, loading, load } = usePagedTab<ClientListItem>(
    (page) => clientsApi.list({ staffId, page, pageSize: PAGE_SIZE }),
    staffId,
    'Failed to load clients.',
  );

  return (
    <>
      <TabTable headers={['Account No', 'Name', 'Mobile', 'Joined', 'Status']} loading={loading} empty="No clients are assigned to this staff member.">
        {(data?.items ?? []).map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-mono text-gray-600">{c.accountNo ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700 font-medium">{c.displayName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || '—'}</td>
            <td className="px-4 py-3 text-gray-700">{c.mobile ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700">{formatDate(c.joinedDate)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={c.status} />
            </td>
          </tr>
        ))}
      </TabTable>
      {data && <Pagination page={data.page} pageSize={PAGE_SIZE} totalCount={data.totalCount} onPageChange={(p) => void load(p)} />}
    </>
  );
}

export function StaffLoansTab({ staffId }: { staffId: number }) {
  const { data, loading, load } = usePagedTab<LoanListItem>(
    (page) => loansApi.list({ loanOfficerId: staffId, page, pageSize: PAGE_SIZE }),
    staffId,
    'Failed to load loans.',
  );

  return (
    <>
      <TabTable headers={['Account No', 'Requested', 'Approved', 'Status']} loading={loading} empty="This staff member isn't the loan officer on any loan.">
        {(data?.items ?? []).map((l) => (
          <tr key={l.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-mono text-gray-600">{l.accountNumber ?? `Loan #${l.id}`}</td>
            <td className="px-4 py-3 text-gray-700 tabular-nums">{formatMoney(l.appliedAmount)}</td>
            <td className="px-4 py-3 text-gray-700 tabular-nums">{formatMoney(l.approvedAmount)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={l.status} />
            </td>
          </tr>
        ))}
      </TabTable>
      {data && <Pagination page={data.page} pageSize={PAGE_SIZE} totalCount={data.totalCount} onPageChange={(p) => void load(p)} />}
    </>
  );
}

export function StaffActivityTab({ staffId }: { staffId: number }) {
  const { data, loading, load } = usePagedTab<StaffActivity>(
    (page) => usersApi.activity(staffId, page, PAGE_SIZE),
    staffId,
    'Failed to load activity.',
  );

  return (
    <>
      <TabTable headers={['When', 'Area', 'Action', 'Details']} loading={loading} empty="No recorded activity yet.">
        {(data?.items ?? []).map((a) => (
          <tr key={a.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(a.createdAt, true)}</td>
            <td className="px-4 py-3 text-gray-700">{a.module ?? '—'}</td>
            <td className="px-4 py-3 text-gray-700 font-medium">{a.action ?? '—'}</td>
            <td className="px-4 py-3 text-gray-500 max-w-md truncate" title={a.notes ?? undefined}>
              {a.notes || '—'}
            </td>
          </tr>
        ))}
      </TabTable>
      {data && <Pagination page={data.page} pageSize={PAGE_SIZE} totalCount={data.totalCount} onPageChange={(p) => void load(p)} />}
    </>
  );
}
