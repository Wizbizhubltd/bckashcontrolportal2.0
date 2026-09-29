import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SearchIcon } from 'lucide-react';
import { groupsApi, type GroupListItem, type GroupStatus } from '../../api/groupsApi';
import { usersApi } from '../../api/usersApi';
import type { Office } from '../../api/officesApi';
import type { BulkActionResult } from '../../api/types';
import { Pagination } from '../../components/Pagination';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { BulkActionMenu, BulkCheckbox, BulkSelectionBar } from '../../components/BulkActions';
import { BulkResultModal } from '../../components/BulkResultModal';
import { OfficeScopedPickerModal } from '../../components/OfficeScopedPickerModal';
import { useBulkSelection } from '../../hooks/useBulkSelection';

const PAGE_SIZE = 15;

type GroupBulkAction = 'reassign-marketer' | 'disable' | 'enable';

const BULK_ACTIONS = [
  { value: 'reassign-marketer' as const, label: 'Reassign to a marketer' },
  { value: 'disable' as const, label: 'Disable groups' },
  { value: 'enable' as const, label: 'Enable groups' },
];

const BULK_ACTION_LABELS: Record<GroupBulkAction, string> = {
  'reassign-marketer': 'Reassign to marketer',
  disable: 'Disable groups',
  enable: 'Enable groups',
};

const BULK_ACTION_DONE: Record<GroupBulkAction, string> = {
  'reassign-marketer': 'were reassigned, along with their members',
  disable: 'were disabled',
  enable: 'were enabled',
};

const plural = (count: number) => `${count} group${count === 1 ? '' : 's'}`;
const groupName = (group: GroupListItem) => group.name || group.accountNo || `Group #${group.id}`;

/** Which groups each action can include — the server checks again and reports anything it skips. */
const selectableFor = (action: GroupBulkAction | null, group: GroupListItem) =>
  action === 'disable' ? group.status === 'Active' : action === 'enable' ? group.status === 'Inactive' : group.status !== 'Closed' && group.status !== 'Declined';

const UNSELECTABLE_REASON: Record<GroupBulkAction, string> = {
  'reassign-marketer': 'Closed and declined groups can’t be reassigned',
  disable: 'Only active groups can be disabled',
  enable: 'Only disabled groups can be enabled',
};

/** The clients page's Groups tab: every group, with bulk reassign-to-marketer and disable/enable. */
export function GroupsTab({ offices }: { offices: Office[] }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<GroupListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [status, setStatus] = useState('');

  const bulk = useBulkSelection<GroupBulkAction>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ action: GroupBulkAction; result: BulkActionResult } | null>(null);
  /** Office of every group seen so far, so the marketer picker can start on the ticked groups' office. */
  const officeOf = useRef(new Map<number, number | null>());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const loaded = await groupsApi.list({
        search: search.trim() || undefined,
        officeId: officeId ? Number(officeId) : undefined,
        status: (status || undefined) as GroupStatus | undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      loaded.items.forEach((g) => officeOf.current.set(g.id, g.officeId));
      setItems(loaded.items);
      setTotalCount(loaded.totalCount);
      setPage(loaded.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load groups.');
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

  const selectable = (group: GroupListItem) => selectableFor(bulk.action, group);
  const pageIds = items.filter(selectable).map((g) => g.id);
  const pageTicked = pageIds.filter((id) => bulk.selected.has(id)).length;

  const selectedOffices = new Set([...bulk.selected].map((id) => officeOf.current.get(id) ?? null));
  const commonOfficeId = selectedOffices.size === 1 ? [...selectedOffices][0] : null;

  const run = async (action: GroupBulkAction, call: () => Promise<BulkActionResult>) => {
    setConfirmOpen(false);
    setRunning(true);
    try {
      setResult({ action, result: await call() });
      bulk.cancel();
      void load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The bulk action failed.');
    } finally {
      setRunning(false);
    }
  };

  const ids = () => [...bulk.selected];

  const loadMarketers = async (office: number) => {
    const marketers = await usersApi.list({ userType: 'marketer', officeId: office, pageSize: 100 });
    return marketers.items
      .filter((m) => !m.blocked)
      .map((m) => ({ label: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email, value: String(m.id) }));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-[280px]">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by group name"
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
            <option value="Inactive">Disabled</option>
            <option value="Declined">Declined</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <BulkActionMenu options={BULK_ACTIONS} onChoose={bulk.start} disabled={bulk.selecting || loading || running || totalCount === 0} />
      </div>

      {bulk.action && (
        <BulkSelectionBar
          actionLabel={BULK_ACTION_LABELS[bulk.action]}
          selectedCount={bulk.selected.size}
          totalCount={totalCount}
          noun="groups"
          onSelectAll={() => bulk.selectOnly([...new Set([...bulk.selected, ...pageIds])])}
          selectAllLabel="Select the groups on this page"
          allSelected={pageIds.length > 0 && pageTicked === pageIds.length}
          onClear={() => bulk.selectOnly([])}
          onContinue={() => setConfirmOpen(true)}
          onCancel={bulk.cancel}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                {bulk.selecting && (
                  <th className="pl-4 py-3 w-8">
                    <BulkCheckbox label="Select every group on this page" checked={pageIds.length > 0 && pageTicked === pageIds.length} indeterminate={pageTicked > 0} onChange={() => bulk.toggleAll(pageIds)} />
                  </th>
                )}
                <th className="px-4 py-3 font-medium">Account No.</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Office</th>
                <th className="px-4 py-3 font-medium">Marketer</th>
                <th className="px-4 py-3 font-medium text-right">Members</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={bulk.selecting ? 7 : 6} className="px-4 py-6 text-center text-gray-400">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={bulk.selecting ? 7 : 6} className="px-4 py-6 text-center text-gray-400">No groups found.</td>
                </tr>
              ) : (
                items.map((group) => {
                  const canTick = selectable(group);
                  return (
                    <tr
                      key={group.id}
                      // While picking groups for a bulk action, clicking a row ticks it instead of opening it.
                      onClick={() => (bulk.selecting ? canTick && bulk.toggle(group.id) : navigate(`/groups/${group.id}`))}
                      title={bulk.action && !canTick ? UNSELECTABLE_REASON[bulk.action] : undefined}
                      className={`${bulk.selecting && !canTick ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${bulk.selected.has(group.id) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      {bulk.selecting && (
                        <td className="pl-4 py-3 w-8">
                          <BulkCheckbox label={`Select ${groupName(group)}`} checked={bulk.selected.has(group.id)} disabled={!canTick} onChange={() => bulk.toggle(group.id)} />
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-700 font-medium">{group.accountNo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{groupName(group)}</td>
                      <td className="px-4 py-3 text-gray-700">{offices.find((o) => o.id === group.officeId)?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{group.staffName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 text-right tabular-nums">{group.memberCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={group.status as StatusType} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={(p) => void load(p)} />
      </div>

      {confirmOpen && bulk.action === 'reassign-marketer' && (
        <OfficeScopedPickerModal
          title={`Reassign ${plural(bulk.selected.size)} to a marketer`}
          description="Each group and every client currently in it move to the marketer. The marketer must work in the group's office — groups in other offices are skipped."
          pickLabel="Marketer"
          confirmLabel="Reassign"
          offices={offices}
          defaultOfficeId={commonOfficeId}
          loadOptions={loadMarketers}
          onConfirm={(marketerId) => void run('reassign-marketer', () => groupsApi.bulkReassignMarketer(ids(), Number(marketerId)))}
          onClose={() => setConfirmOpen(false)}
        />
      )}

      <ConfirmationModal
        isOpen={confirmOpen && bulk.action === 'disable'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(reason) => reason && void run('disable', () => groupsApi.bulkDisable(ids(), reason.trim()))}
        title={`Disable ${plural(bulk.selected.size)}?`}
        description="Disabled groups stay on record with their members but are marked inactive until they're enabled again. The reason is saved on each group."
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel="Disable groups"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={confirmOpen && bulk.action === 'enable'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void run('enable', () => groupsApi.bulkEnable(ids()))}
        title={`Enable ${plural(bulk.selected.size)}?`}
        description="The groups become active again."
        confirmLabel="Enable groups"
      />

      {running && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-xl bg-white px-6 py-4 text-sm text-gray-700 shadow-xl">Working…</div>
        </div>
      )}

      {result && (
        <BulkResultModal title={BULK_ACTION_LABELS[result.action]} result={result.result} done={BULK_ACTION_DONE[result.action]} noun={plural} onClose={() => setResult(null)} />
      )}
    </div>
  );
}
