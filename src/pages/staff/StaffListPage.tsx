import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PlusIcon } from 'lucide-react';
import { usersApi, USER_TYPE_SLUGS, type StaffUser, type OnboardingStatus, type BulkActionResult } from '../../api/usersApi';
import { officesApi, type Office } from '../../api/officesApi';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { BulkActionMenu, BulkCheckbox, BulkSelectionBar } from '../../components/BulkActions';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { BulkResultModal } from '../../components/BulkResultModal';

const PAGE_SIZE = 15;

type StaffBulkAction = 'reset-password' | 'transfer' | 'disable';

const BULK_ACTIONS = [
  { value: 'reset-password' as const, label: 'Force password reset' },
  { value: 'transfer' as const, label: 'Transfer to an office' },
  { value: 'disable' as const, label: 'Disable staff' },
];

const BULK_ACTION_LABELS: Record<StaffBulkAction, string> = {
  'reset-password': 'Force password reset',
  transfer: 'Transfer to office',
  disable: 'Disable staff',
};

const BULK_ACTION_DONE: Record<StaffBulkAction, string> = {
  'reset-password': 'had their password reset and were emailed',
  transfer: 'were transferred and emailed',
  disable: 'were disabled',
};

const staffName = (staff: StaffUser) => `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim() || staff.email;
const plural = (count: number) => `${count} staff member${count === 1 ? '' : 's'}`;

const USER_TYPE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  controller: 'Controller',
  director: 'Director',
  manager: 'Manager',
  marketer: 'Marketer',
};

interface StaffListPageProps {
  /** Locks the list (and hides the picker) to a single user_type — used by the Super Admins screen. */
  fixedUserType?: string;
  title?: string;
  subtitle?: string;
  createLabel?: string;
  createTo?: string;
}

export function StaffListPage({ fixedUserType, title, subtitle, createLabel, createTo }: StaffListPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [items, setItems] = useState<StaffUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);

  const [officeId, setOfficeId] = useState('');
  const [userType, setUserType] = useState(fixedUserType ?? '');
  const [onboardingStatus, setOnboardingStatus] = useState((searchParams.get('onboardingStatus') as OnboardingStatus | null) ?? '');
  const [search, setSearch] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bulk = useBulkSelection<StaffBulkAction>();
  /** Force password reset only: every staff member matching the filters, across all pages, rather than the ticked rows. */
  const [allMatching, setAllMatching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ action: StaffBulkAction; result: BulkActionResult } | null>(null);
  // Super admins are exempt from every bulk action, so there's nothing to do on the Super Admins screen.
  const bulkEnabled = fixedUserType !== 'super_admin';

  useEffect(() => {
    void officesApi.list().then(setOffices).catch(() => undefined);
  }, []);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await usersApi.list({
        officeId: officeId ? Number(officeId) : undefined,
        userType: fixedUserType || userType || undefined,
        onboardingStatus: (onboardingStatus || undefined) as OnboardingStatus | undefined,
        search: search.trim() || undefined,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load staff.');
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
  }, [officeId, userType, onboardingStatus, search]);

  const startBulk = (action: StaffBulkAction) => {
    setAllMatching(false);
    bulk.start(action);
  };

  const cancelBulk = () => {
    setAllMatching(false);
    bulk.cancel();
  };

  /** Super admins are exempt from bulk actions, and only active staff can be transferred or disabled (the server enforces both too). */
  const selectable = (staff: StaffUser) => staff.userType !== 'super_admin' && (bulk.action === 'reset-password' || !staff.blocked);
  const unselectableReason = (staff: StaffUser) => (staff.userType === 'super_admin' ? 'Super admins are exempt from bulk actions' : 'Only active staff can be included');
  const pageIds = items.filter(selectable).map((s) => s.id);
  const pageTicked = allMatching ? pageIds.length : pageIds.filter((id) => bulk.selected.has(id)).length;
  const selectedCount = allMatching ? totalCount : bulk.selected.size;

  const toggleRow = (id: number) => {
    if (allMatching) {
      // Unticking one row drops "all staff" back to the rows on screen, minus that one.
      setAllMatching(false);
      bulk.selectOnly(pageIds.filter((pid) => pid !== id));
      return;
    }
    bulk.toggle(id);
  };

  const togglePage = () => {
    if (allMatching) {
      setAllMatching(false);
      bulk.selectOnly([]);
      return;
    }
    bulk.toggleAll(pageIds);
  };

  const runBulk = async (targetOfficeId?: string) => {
    setConfirmOpen(false);
    const action = bulk.action;
    if (!action || (action === 'transfer' && !targetOfficeId)) return;

    setRunning(true);
    try {
      const outcome =
        action === 'reset-password'
          ? await usersApi.bulkResetPassword(
              allMatching
                ? {
                    all: true,
                    filters: {
                      officeId: officeId ? Number(officeId) : undefined,
                      userType: fixedUserType || userType || undefined,
                      onboardingStatus: (onboardingStatus || undefined) as OnboardingStatus | undefined,
                      search: search.trim() || undefined,
                    },
                  }
                : { userIds: [...bulk.selected] },
            )
          : action === 'transfer'
            ? await usersApi.bulkTransfer([...bulk.selected], Number(targetOfficeId))
            : await usersApi.bulkDisable([...bulk.selected]);
      setResult({ action, result: outcome });
      cancelBulk();
      void load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The bulk action failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-heading font-bold text-primary">{title ?? 'Staff Directory'}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle ?? 'Every staff account across the network, and their RBAC role.'}</p>
        </div>
        <div className="flex items-center gap-3">
          {bulkEnabled && <BulkActionMenu options={BULK_ACTIONS} onChoose={startBulk} disabled={bulk.selecting || loading || running || totalCount === 0} />}
          <Link to={createTo ?? '/staff/new'} className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <PlusIcon size={16} />
            {createLabel ?? 'Add Staff'}
          </Link>
        </div>
      </div>

      <div className={`bg-white rounded-xl border border-gray-100 p-4 mb-4 grid grid-cols-1 gap-3 ${fixedUserType ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />

        <select value={officeId} onChange={(e) => setOfficeId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {!fixedUserType && (
          <select value={userType} onChange={(e) => setUserType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
            <option value="">All Roles</option>
            {USER_TYPE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {USER_TYPE_LABELS[slug]}
              </option>
            ))}
          </select>
        )}

        <select value={onboardingStatus} onChange={(e) => setOnboardingStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
          <option value="">All Onboarding Statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Declined">Declined</option>
        </select>
      </div>

      {bulk.action && (
        <BulkSelectionBar
          actionLabel={BULK_ACTION_LABELS[bulk.action]}
          selectedCount={selectedCount}
          totalCount={totalCount}
          noun="staff"
          onSelectAll={() => (bulk.action === 'reset-password' ? setAllMatching(true) : bulk.selectOnly([...new Set([...bulk.selected, ...pageIds])]))}
          selectAllLabel={bulk.action === 'reset-password' ? `Select all ${totalCount} staff` : 'Select active staff on this page'}
          allSelected={bulk.action === 'reset-password' ? allMatching : pageIds.length > 0 && pageTicked === pageIds.length}
          onClear={() => {
            setAllMatching(false);
            bulk.selectOnly([]);
          }}
          onContinue={() => setConfirmOpen(true)}
          onCancel={cancelBulk}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              {bulk.selecting && (
                <th className="pl-4 py-3 w-8">
                  <BulkCheckbox label="Select every staff member on this page" checked={pageIds.length > 0 && pageTicked === pageIds.length} indeterminate={pageTicked > 0} onChange={togglePage} />
                </th>
              )}
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Office</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Onboarding</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={bulk.selecting ? 8 : 7} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={bulk.selecting ? 8 : 7} className="px-4 py-6 text-center text-gray-400">
                  No staff found.
                </td>
              </tr>
            ) : (
              items.map((staff) => (
                <tr
                  key={staff.id}
                  // While picking staff for a bulk action, clicking a row ticks it instead of opening it.
                  onClick={() => (bulk.selecting ? selectable(staff) && toggleRow(staff.id) : navigate(`/staff/${staff.id}`))}
                  title={bulk.selecting && !selectable(staff) ? unselectableReason(staff) : undefined}
                  className={`${bulk.selecting && !selectable(staff) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                    allMatching || bulk.selected.has(staff.id) ? 'bg-primary/5' : 'hover:bg-gray-50'
                  }`}
                >
                  {bulk.selecting && (
                    <td className="pl-4 py-3 w-8">
                      <BulkCheckbox
                        label={`Select ${staffName(staff)}`}
                        checked={selectable(staff) && (allMatching || bulk.selected.has(staff.id))}
                        disabled={!selectable(staff)}
                        onChange={() => toggleRow(staff.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-700">
                    {/* Kept as a real link for keyboard users and open-in-new-tab; stopPropagation so the row doesn't navigate a second time. */}
                    <Link to={`/staff/${staff.id}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline font-medium">
                      {staffName(staff)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{staff.email}</td>
                  <td className="px-4 py-3 text-gray-700">{staff.officeName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{staff.userType ? USER_TYPE_LABELS[staff.userType] ?? staff.userType : '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={staff.onboardingStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={staff.blocked ? 'Blocked' : 'Active'} />
                  </td>
                  <td className="px-4 py-3">
                    <PasswordResetIndicator staff={staff} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={(p) => void load(p)} />
      </div>

      <ConfirmationModal
        isOpen={confirmOpen && bulk.action === 'reset-password'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void runBulk()}
        title={`Force a password reset for ${allMatching ? `all ${plural(selectedCount)}` : plural(selectedCount)}?`}
        description="Each of them is emailed a new 8-character password and a link to the staff portal, and must change it when they next sign in. Their current password stops working straight away. Blocked staff are skipped, and super admins are exempt."
        confirmLabel="Reset passwords"
        confirmVariant="orange"
      />

      <ConfirmationModal
        isOpen={confirmOpen && bulk.action === 'transfer'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(targetOfficeId) => void runBulk(targetOfficeId)}
        title={`Transfer ${plural(selectedCount)} to an office`}
        description="Each staff member moved is emailed about the transfer. Anyone with clients on active loans stays in their current office, as does anyone already in the office you pick."
        inputType="select"
        inputLabel="Office"
        selectOptions={offices.filter((o) => o.active).map((o) => ({ label: o.name ?? `Office #${o.id}`, value: String(o.id) }))}
        requireInput
        confirmLabel="Transfer staff"
      />

      <ConfirmationModal
        isOpen={confirmOpen && bulk.action === 'disable'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void runBulk()}
        title={`Disable ${plural(selectedCount)}?`}
        description="They're blocked and can no longer sign in until someone unblocks them from their staff record. Super admins are exempt."
        confirmLabel="Disable staff"
        confirmVariant="danger"
      />

      {running && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-xl bg-white px-6 py-4 text-sm text-gray-700 shadow-xl">Working…</div>
        </div>
      )}

      {result && (
        <BulkResultModal
          title={BULK_ACTION_LABELS[result.action]}
          result={result.result}
          done={BULK_ACTION_DONE[result.action]}
          noun={plural}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  );
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Whether the staff member has reset their password since an admin forced a reset: amber while they're
 * still on the temporary password, green once they've set their own.
 */
function PasswordResetIndicator({ staff }: { staff: StaffUser }) {
  if (staff.mustChangePassword) {
    return (
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
        title={staff.passwordResetRequestedAt ? `Temporary password issued ${shortDate(staff.passwordResetRequestedAt)} — not changed yet` : 'On a temporary password — not changed yet'}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Reset pending
      </span>
    );
  }

  if (staff.passwordResetRequestedAt && staff.passwordChangedAt && staff.passwordChangedAt >= staff.passwordResetRequestedAt) {
    return (
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
        title={`Reset requested ${shortDate(staff.passwordResetRequestedAt)}; they set a new password ${shortDate(staff.passwordChangedAt)}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Reset {shortDate(staff.passwordChangedAt)}
      </span>
    );
  }

  return <span className="text-gray-400">—</span>;
}
