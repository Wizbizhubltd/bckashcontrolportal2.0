import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BanIcon, Building2Icon, PencilIcon, PowerIcon, UserCogIcon, UsersIcon, WalletIcon } from 'lucide-react';
import type { ApiError } from '../../api/apiClient';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { BusinessOperationsTab } from './BusinessOperationsTab';
import { officesApi, type Office } from '../../api/officesApi';
import { usersApi, type StaffUser } from '../../api/usersApi';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';

const STAFF_PAGE_SIZE = 10;

const TABS = [
  { key: 'details', label: 'Office details', icon: Building2Icon },
  { key: 'operations', label: 'Business operations', icon: WalletIcon },
  { key: 'staff', label: 'Staff directory', icon: UsersIcon },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function staffName(user: StaffUser) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 break-words">{children || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

export function OfficeDetailPage() {
  const { id } = useParams();
  const officeId = Number(id);

  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffPage, setStaffPage] = useState(1);
  const [inUse, setInUse] = useState<{ activeClientCount: number; openLoanCount: number } | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [managers, setManagers] = useState<StaffUser[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);

  // In the URL so a refresh or a shared link opens the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'details';
  const selectTab = (key: TabKey) => setSearchParams(key === 'details' ? {} : { tab: key }, { replace: true });

  useEffect(() => {
    setLoading(true);
    void officesApi
      .get(officeId)
      .then(setOffice)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load office.'))
      .finally(() => setLoading(false));
  }, [officeId]);

  useEffect(() => {
    // Offered as branch managers: active, onboarded staff with the Manager role.
    void usersApi
      .list({ userType: 'manager', pageSize: 100 })
      .then((result) => setManagers(result.items.filter((u) => !u.blocked && u.onboardingStatus === 'Approved')))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void usersApi
      .list({ officeId, page: staffPage, pageSize: STAFF_PAGE_SIZE })
      .then((result) => {
        setStaff(result.items);
        setStaffTotal(result.totalCount);
      })
      .catch(() => undefined);
  }, [officeId, staffPage]);

  /** Asks first; if the office still has active clients or open loans, the server returns the counts to confirm against. */
  const deactivate = async (confirm: boolean) => {
    setBusy(true);
    try {
      setOffice(await officesApi.deactivate(officeId, confirm));
      setInUse(null);
      setConfirmDeactivate(false);
      toast.success('Office deactivated.');
    } catch (error) {
      const apiError = error as ApiError;
      const counts = apiError.responseData as { activeClientCount?: number; openLoanCount?: number } | undefined;
      if (apiError.status === 409 && counts?.activeClientCount !== undefined) {
        setConfirmDeactivate(false);
        setInUse({ activeClientCount: counts.activeClientCount ?? 0, openLoanCount: counts.openLoanCount ?? 0 });
      } else {
        toast.error(apiError.message || 'Failed to deactivate the office.');
      }
    } finally {
      setBusy(false);
    }
  };

  const assignManager = async (managerId: string | undefined) => {
    setBusy(true);
    try {
      const updated = await officesApi.assignManager(officeId, managerId ? Number(managerId) : null);
      setOffice(updated);
      const name = managers.find((m) => m.id === updated.managerId);
      toast.success(name ? `${staffName(name)} is now the branch manager.` : 'Branch manager removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign the manager.');
    } finally {
      setBusy(false);
    }
  };

  const activate = async () => {
    setBusy(true);
    try {
      setOffice(await officesApi.activate(officeId));
      toast.success('Office activated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to activate the office.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading…</div>;
  }

  if (!office) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-3">Office not found.</p>
        <Link to="/offices" className="text-primary hover:underline text-sm">Back to Office Directory</Link>
      </div>
    );
  }

  const createdAt = formatDate(office.createdAt);
  const manager = managers.find((m) => m.id === office.managerId);
  const managerLabel = manager ? staffName(manager) : office.managerId ? `Staff #${office.managerId}` : null;

  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-heading font-bold text-primary">{office.name}</h1>
              <StatusBadge status={office.active ? 'Active' : 'Inactive'} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {office.defaultOffice ? 'Head office' : 'Branch'}
              {office.officeCode && (
                <>
                  {' · '}
                  <span className="font-mono">{office.officeCode}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/offices/${office.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5">
              <PencilIcon size={14} />
              Edit office
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAssignOpen(true)}
              title={managerLabel ? 'Change the branch manager' : 'Assign a branch manager'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 disabled:opacity-50"
            >
              <UserCogIcon size={14} />
              {managerLabel ? `Manager: ${managerLabel}` : 'Assign manager'}
            </button>
            {office.active ? (
              <button type="button" disabled={busy} onClick={() => setConfirmDeactivate(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
                <BanIcon size={14} />
                Deactivate office
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void activate()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-heading font-bold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50">
                <PowerIcon size={14} />
                Activate office
              </button>
            )}
          </div>
        </div>
      </div>

      <div role="tablist" className="flex overflow-x-auto border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => selectTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-accent text-primary font-heading font-bold' : 'border-transparent text-gray-500 hover:text-primary'}`}
          >
            <t.icon size={16} />
            {t.label}
            {t.key === 'staff' && <span className="text-xs text-gray-400">({office.staffCount})</span>}
          </button>
        ))}
      </div>

      {/* Re-mounted when the manager changes, so its funding checks reflect the new manager. */}
      {tab === 'operations' && <BusinessOperationsTab key={office.managerId ?? 0} officeId={office.id} officeActive={office.active} />}

      {tab === 'details' && (

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <section className="bg-white rounded-xl border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-sm font-heading font-bold text-gray-700 mb-4">Office details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Branch manager">{managerLabel}</Field>
            <Field label="Parent office">
              {office.parentId ? <Link to={`/offices/${office.parentId}`} className="text-primary hover:underline">{office.parentName ?? `Office #${office.parentId}`}</Link> : null}
            </Field>
            <Field label="Opening date">{office.openingDate}</Field>
            <Field label="Phone">{office.phone}</Field>
            <Field label="Email">{office.email}</Field>
            <Field label="Address">{office.address}</Field>
            <Field label="External ID">{office.externalId}</Field>
            <div className="sm:col-span-2">
              <Field label="Notes">{office.notes}</Field>
            </div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-heading font-bold text-gray-700 mb-4">Location</h2>
            <dl className="space-y-3">
              <Field label="Zone">{office.zoneName}</Field>
              <Field label="State">{office.stateName}</Field>
              <Field label="Local government area">{office.lgaName}</Field>
              <Field label="City">{office.cityName}</Field>
            </dl>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-sm font-heading font-bold text-gray-700 mb-4">Record</h2>
            <dl className="space-y-3">
              <Field label="Created">{createdAt}</Field>
              <Field label="Created by">{office.createdByName}</Field>
            </dl>
          </section>
        </div>
      </div>

      )}

      {tab === 'staff' && (
      <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-heading font-bold text-gray-700">Staff ({office.staffCount})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">User type</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">No staff assigned to this office.</td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/staff/${member.id}`} className="text-primary hover:underline font-medium">
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{member.email}</td>
                    <td className="px-4 py-3 text-gray-700">{member.userType ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.blocked ? 'Blocked' : 'Active'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {staffTotal > STAFF_PAGE_SIZE && <Pagination page={staffPage} pageSize={STAFF_PAGE_SIZE} totalCount={staffTotal} onPageChange={setStaffPage} />}
      </section>
      )}

      <ConfirmationModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        onConfirm={(managerId) => {
          setAssignOpen(false);
          void assignManager(managerId);
        }}
        title={managerLabel ? 'Change branch manager' : 'Assign branch manager'}
        description="The branch manager acknowledges or disputes the funding this office receives. Staff with the Manager role are listed."
        inputType="select"
        inputLabel="Branch manager"
        selectOptions={managers.map((m) => ({ label: `${staffName(m)}${m.officeName ? ` — ${m.officeName}` : ''}`, value: String(m.id) }))}
        requireInput
        confirmLabel={managerLabel ? 'Change manager' : 'Assign manager'}
        confirmVariant="primary"
      />
      <ConfirmationModal
        isOpen={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        onConfirm={() => void deactivate(false)}
        title={`Deactivate ${office.name ?? 'this office'}?`}
        description="The office will stop taking new business and can’t be funded. It can be activated again later."
        confirmLabel="Deactivate"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={!!inUse}
        onClose={() => setInUse(null)}
        onConfirm={() => void deactivate(true)}
        title="This office is still in use"
        description={inUse ? `It has ${inUse.activeClientCount} active client(s) and ${inUse.openLoanCount} open loan(s). Deactivate it anyway?` : ''}
        confirmLabel="Deactivate anyway"
        confirmVariant="danger"
      />
    </div>
  );
}
