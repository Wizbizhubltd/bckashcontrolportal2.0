import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon, CheckCircleIcon, XCircleIcon, PencilIcon, SearchIcon, XIcon } from 'lucide-react';
import { officesApi, type Office } from '../../api/officesApi';
import { useLocationOptions } from '../../hooks/useLocationOptions';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Pagination } from '../../components/Pagination';
import type { ApiError } from '../../api/apiClient';

const PAGE_SIZE = 15;

interface OfficeFilters {
  type: '' | 'head' | 'branch';
  stateId: string;
  lgaId: string;
  cityId: string;
  zoneId: string;
}

const noFilters: OfficeFilters = { type: '', stateId: '', lgaId: '', cityId: '', zoneId: '' };

const filterSelectClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:bg-gray-50 disabled:text-gray-400';

export function OfficesListPage() {
  const navigate = useNavigate();
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivateTarget, setDeactivateTarget] = useState<Office | null>(null);
  const [deactivateWarning, setDeactivateWarning] = useState<{ activeClientCount: number; openLoanCount: number } | null>(null);

  // The offices API returns the whole (small, reference-data-sized) list unpaginated — search
  // and pagination happen client-side here rather than adding server-side paging to an endpoint
  // other screens rely on returning everything.
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<OfficeFilters>(noFilters);
  const [page, setPage] = useState(1);

  const { states, lgas, cities, zones } = useLocationOptions(
    filters.stateId ? Number(filters.stateId) : undefined,
    filters.lgaId ? Number(filters.lgaId) : undefined,
  );

  const setFilter = (field: keyof OfficeFilters) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFilters((prev) => {
      const next = { ...prev, [field]: value } as OfficeFilters;
      if (field === 'stateId') {
        next.lgaId = '';
        next.cityId = '';
      }
      if (field === 'lgaId') next.cityId = '';
      return next;
    });
  };

  const hasFilters = search.trim() !== '' || Object.values(filters).some(Boolean);

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return offices.filter((o) => {
      if (term && !(o.name ?? '').toLowerCase().includes(term) && !(o.officeCode ?? '').toLowerCase().includes(term)) return false;
      if (filters.type === 'head' && !o.defaultOffice) return false;
      if (filters.type === 'branch' && o.defaultOffice) return false;
      if (filters.stateId && o.stateId !== Number(filters.stateId)) return false;
      if (filters.lgaId && o.lgaId !== Number(filters.lgaId)) return false;
      if (filters.cityId && o.cityId !== Number(filters.cityId)) return false;
      if (filters.zoneId && o.zoneId !== Number(filters.zoneId)) return false;
      return true;
    });
  }, [offices, search, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedOffices = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

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

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or office code"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFilters(noFilters);
              }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
            >
              <XIcon size={14} />
              Clear filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select aria-label="Office type" value={filters.type} onChange={setFilter('type')} className={filterSelectClass}>
            <option value="">Head &amp; branches</option>
            <option value="head">Head office</option>
            <option value="branch">Branches</option>
          </select>
          <select aria-label="State" value={filters.stateId} onChange={setFilter('stateId')} className={filterSelectClass}>
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select aria-label="LGA" value={filters.lgaId} onChange={setFilter('lgaId')} disabled={!filters.stateId} className={filterSelectClass}>
            <option value="">{filters.stateId ? 'All LGAs' : 'Pick a state first'}</option>
            {lgas.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select aria-label="City" value={filters.cityId} onChange={setFilter('cityId')} disabled={!filters.stateId} className={filterSelectClass}>
            <option value="">{filters.stateId ? 'All cities' : 'Pick a state first'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select aria-label="Zone" value={filters.zoneId} onChange={setFilter('zoneId')} className={filterSelectClass}>
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Office Code</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Location</th>
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
                <tr key={office.id} onClick={() => navigate(`/offices/${office.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    <Link to={`/offices/${office.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">
                      {office.name}
                    </Link>
                    {office.defaultOffice && <span className="ml-2 text-[10px] uppercase tracking-wide text-primary/70 font-heading font-bold">Head Office</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">{office.officeCode ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{office.zoneName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {office.stateName ? [office.cityName, office.lgaName, office.stateName].filter(Boolean).join(', ') : <span className="text-gray-400">Not set</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={office.active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
        </div>

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
