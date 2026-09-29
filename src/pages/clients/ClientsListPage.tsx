import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ContactIcon, SearchIcon, ShieldAlertIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { clientsApi, type ClientListItem, type ClientRiskDetail, type ClientStatus } from '../../api/clientsApi';
import { groupsApi } from '../../api/groupsApi';
import type { BulkActionResult } from '../../api/types';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { officesApi, type Office } from '../../api/officesApi';
import { Pagination } from '../../components/Pagination';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';
import { BulkActionMenu, BulkCheckbox, BulkSelectionBar } from '../../components/BulkActions';
import { BulkResultModal } from '../../components/BulkResultModal';
import { OfficeScopedPickerModal } from '../../components/OfficeScopedPickerModal';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { GroupsTab } from './GroupsTab';

const PAGE_SIZE = 15;

type ClientBulkAction = 'move-to-group';

const BULK_ACTIONS = [{ value: 'move-to-group' as const, label: 'Move to a group' }];

const TABS = [
  { key: 'clients', label: 'Clients', icon: ContactIcon },
  { key: 'groups', label: 'Groups', icon: UsersIcon },
] as const;

const plural = (count: number) => `${count} client${count === 1 ? '' : 's'}`;

export function ClientsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // In the URL so a refresh or a shared link lands on the same tab.
  const tab = searchParams.get('tab') === 'groups' ? 'groups' : 'clients';

  const [items, setItems] = useState<ClientListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);

  const [search, setSearch] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [status, setStatus] = useState((searchParams.get('status') as ClientStatus | null) ?? '');
  const [risk, setRisk] = useState(searchParams.get('risk') === 'high' ? 'high' : '');
  const [reviewing, setReviewing] = useState<ClientRiskDetail | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bulk = useBulkSelection<ClientBulkAction>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BulkActionResult | null>(null);
  /** Office of every client seen so far, so the group picker can start on the ticked clients' office. */
  const officeOf = useRef(new Map<number, number | null>());

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
        highRisk: risk === 'high' ? true : undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      result.items.forEach((c) => officeOf.current.set(c.id, c.officeId));
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
  }, [search, officeId, status, risk]);

  const openReview = async (item: ClientListItem) => {
    try {
      setReviewing(await clientsApi.get(item.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load the client.');
    }
  };

  const markSafe = async (note: string | undefined) => {
    if (!reviewing) return;
    const client = reviewing;
    setReviewing(null);
    try {
      await clientsApi.markSafe(client.id, note?.trim() || null);
      toast.success(`${client.displayName ?? 'Client'} marked safe — a controller can now approve them.`);
      void load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The client could not be marked safe.');
    }
  };

  const pageIds = items.map((c) => c.id);
  const pageTicked = pageIds.filter((id) => bulk.selected.has(id)).length;
  const selectedOffices = new Set([...bulk.selected].map((id) => officeOf.current.get(id) ?? null));
  const commonOfficeId = selectedOffices.size === 1 ? [...selectedOffices][0] : null;

  const loadOpenGroups = async (office: number) => {
    const groups = await groupsApi.list({ officeId: office, pageSize: 100 });
    return groups.items
      .filter((g) => g.status === 'Active' || g.status === 'Pending')
      .map((g) => ({ label: `${g.name || g.accountNo || `Group #${g.id}`} · ${g.memberCount} member${g.memberCount === 1 ? '' : 's'}`, value: String(g.id) }));
  };

  const moveToGroup = async (groupId: string) => {
    setPickerOpen(false);
    setRunning(true);
    try {
      setResult(await groupsApi.bulkMoveClients(Number(groupId), [...bulk.selected]));
      bulk.cancel();
      void load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The clients could not be moved.');
    } finally {
      setRunning(false);
    }
  };

  const officeName = (id: number | null) => offices.find((o) => o.id === id)?.name ?? '—';

  // `displayName`/`fullName` are legacy denormalized columns that are blank on real imported
  // data — the name shown here is always built from firstName/lastName directly, never that
  // stored (unreliable) value.
  const clientName = (item: ClientListItem) => `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.accountNo || `Client #${item.id}`;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-heading font-bold text-primary">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Every client account and savings group across the network.</p>
      </div>

      <div role="tablist" className="flex border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setSearchParams(t.key === 'clients' ? {} : { tab: t.key }, { replace: true })}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-accent text-primary font-heading font-bold' : 'border-transparent text-gray-500 hover:text-primary'}`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'groups' ? (
        <GroupsTab offices={offices} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1 min-w-[280px]">
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
              <select value={risk} onChange={(e) => setRisk(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="">All risk levels</option>
                <option value="high">High risk — awaiting review</option>
              </select>
            </div>
            <BulkActionMenu options={BULK_ACTIONS} onChoose={bulk.start} disabled={bulk.selecting || loading || running || totalCount === 0} />
          </div>

          {bulk.selecting && (
            <BulkSelectionBar
              actionLabel="Move to group"
              selectedCount={bulk.selected.size}
              totalCount={totalCount}
              noun="clients"
              onSelectAll={() => bulk.selectOnly([...new Set([...bulk.selected, ...pageIds])])}
              selectAllLabel="Select the clients on this page"
              allSelected={pageIds.length > 0 && pageTicked === pageIds.length}
              onClear={() => bulk.selectOnly([])}
              onContinue={() => setPickerOpen(true)}
              onCancel={bulk.cancel}
            />
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  {bulk.selecting && (
                    <th className="pl-4 py-3 w-8">
                      <BulkCheckbox label="Select every client on this page" checked={pageIds.length > 0 && pageTicked === pageIds.length} indeterminate={pageTicked > 0} onChange={() => bulk.toggleAll(pageIds)} />
                    </th>
                  )}
                  <th className="px-4 py-3 font-medium">Account No.</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Office</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={bulk.selecting ? 8 : 7} className="px-4 py-6 text-center text-gray-400">Loading…</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={bulk.selecting ? 8 : 7} className="px-4 py-6 text-center text-gray-400">No clients found.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      // While picking clients for a bulk action, clicking a row ticks it instead of opening it.
                      onClick={() => (bulk.selecting ? bulk.toggle(item.id) : navigate(`/clients/${item.id}`))}
                      className={`cursor-pointer ${bulk.selected.has(item.id) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      {bulk.selecting && (
                        <td className="pl-4 py-3 w-8">
                          <BulkCheckbox label={`Select ${clientName(item)}`} checked={bulk.selected.has(item.id)} onChange={() => bulk.toggle(item.id)} />
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.accountNo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{clientName(item)}</td>
                      <td className="px-4 py-3 text-gray-700">{item.mobile || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{officeName(item.officeId)}</td>
                      <td className="px-4 py-3 text-gray-700">{item.groupName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status as StatusType} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.isHighRisk ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void openReview(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            <ShieldAlertIcon size={13} /> High risk — review
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={(p) => void load(p)} />
          </div>
        </>
      )}

      {pickerOpen && (
        <OfficeScopedPickerModal
          title={`Move ${plural(bulk.selected.size)} to a group`}
          description="They leave their current group and join the one you pick. Clients with active loans, defaulters, and clients from another office stay where they are."
          pickLabel="Group"
          confirmLabel="Move clients"
          offices={offices}
          defaultOfficeId={commonOfficeId}
          loadOptions={loadOpenGroups}
          onConfirm={(groupId) => void moveToGroup(groupId)}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {running && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-xl bg-white px-6 py-4 text-sm text-gray-700 shadow-xl">Working…</div>
        </div>
      )}

      {result && <BulkResultModal title="Move to group" result={result} done="were moved" noun={plural} onClose={() => setResult(null)} />}

      <ConfirmationModal
        isOpen={!!reviewing}
        onClose={() => setReviewing(null)}
        onConfirm={(note) => void markSafe(note)}
        title={`Mark ${reviewing?.displayName ?? 'this client'} safe?`}
        description={`Onboarded by ${reviewing?.createdByName ?? 'unknown'} (${reviewing?.officeName ?? 'no office'}) with details that differ from their BVN record. Reason given: “${reviewing?.highRiskReason ?? '—'}”. Marking them safe lets a controller approve them.`}
        icon={<ShieldCheckIcon size={20} className="text-primary" />}
        inputType="textarea"
        inputLabel="Note (optional) — e.g. what you checked"
        confirmLabel="Mark safe"
        confirmVariant="primary"
      />
    </div>
  );
}
