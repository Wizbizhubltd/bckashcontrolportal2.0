import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, CheckCircleIcon, XCircleIcon, PencilIcon, SearchIcon } from 'lucide-react';
import { officesApi, type Office } from '../../api/officesApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Pagination } from '../../components/Pagination';
import type { ApiError } from '../../api/apiClient';

const PAGE_SIZE = 15;

export function OfficesListPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivateTarget, setDeactivateTarget] = useState<Office | null>(null);
  const [deactivateWarning, setDeactivateWarning] = useState<{ activeClientCount: number; openLoanCount: number } | null>(null);

  // The offices API returns the whole (small, reference-data-sized) list unpaginated — search
  // and pagination happen client-side here rather than adding server-side paging to an endpoint
  // other screens rely on returning everything.
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const data = await officesApi.list();
      setOffices(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load offices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const officeName = (id: number | null) => offices.find((o) => o.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    if (!search.trim()) return offices;
    const term = search.trim().toLowerCase();
    return offices.filter((o) => (o.name ?? '').toLowerCase().includes(term));
  }, [offices, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedOffices = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const activate = async (office: Office) => {
    try {
      await officesApi.activate(office.id);
      toast.success(`${office.name} reactivated.`);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate office.');
    }
  };

  const requestDeactivate = (office: Office) => {
    setDeactivateWarning(null);
    setDeactivateTarget(office);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await officesApi.deactivate(deactivateTarget.id, deactivateWarning !== null);
      toast.success(`${deactivateTarget.name} deactivated.`);
      setDeactivateTarget(null);
      setDeactivateWarning(null);
      void load();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 409 && apiError.responseData) {
        setDeactivateWarning(apiError.responseData as { activeClientCount: number; openLoanCount: number });
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate office.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-primary">Office Directory</h1>
          <p className="text-sm text-gray-500 mt-1">Branches and offices operating under the network.</p>
        </div>
        <Link to="/offices/new" className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <PlusIcon size={16} />
          Add Office
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="relative max-w-xs">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by office name"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Parent Office</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td>
              </tr>
            ) : pagedOffices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No offices found.</td>
              </tr>
            ) : (
              pagedOffices.map((office) => (
                <tr key={office.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {office.name}
                    {office.defaultOffice && <span className="ml-2 text-[10px] uppercase tracking-wide text-primary/70 font-heading font-bold">Head Office</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{officeName(office.parentId)}</td>
                  <td className="px-4 py-3 text-gray-700">{office.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{office.email || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={office.active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/offices/${office.id}/edit`} className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit">
                        <PencilIcon size={16} />
                      </Link>
                      {office.active ? (
                        <button onClick={() => requestDeactivate(office)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate">
                          <XCircleIcon size={16} />
                        </button>
                      ) : (
                        <button onClick={() => void activate(office)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activate">
                          <CheckCircleIcon size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />
      </div>

      <ConfirmationModal
        isOpen={!!deactivateTarget}
        onClose={() => {
          setDeactivateTarget(null);
          setDeactivateWarning(null);
        }}
        onConfirm={() => void confirmDeactivate()}
        title={`Deactivate ${deactivateTarget?.name ?? 'office'}?`}
        description={
          deactivateWarning
            ? `This office has ${deactivateWarning.activeClientCount} active client(s) and ${deactivateWarning.openLoanCount} open loan(s). Deactivating it anyway will not affect those records, but new activity should be redirected first.`
            : 'Staff assigned to this office will remain assigned. You can reactivate it at any time.'
        }
        confirmLabel={deactivateWarning ? 'Deactivate Anyway' : 'Deactivate'}
        confirmVariant="danger"
      />
    </div>
  );
}
