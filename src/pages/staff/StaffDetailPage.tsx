import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  KeyRoundIcon,
  BanIcon,
  UnlockIcon,
  Building2Icon,
  UserIcon,
  ContactIcon,
  LandmarkIcon,
  HistoryIcon,
} from 'lucide-react';
import { usersApi, USER_TYPE_SLUGS, type StaffUser, type UserClass } from '../../api/usersApi';
import { officesApi, type Office } from '../../api/officesApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { StaffActivityTab, StaffClientsTab, StaffLoansTab } from './StaffRecordTabs';

const USER_TYPE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  controller: 'Controller',
  director: 'Director',
  manager: 'Manager',
  marketer: 'Marketer',
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: UserIcon },
  { key: 'clients', label: 'Clients', icon: ContactIcon },
  { key: 'loans', label: 'Loans', icon: LandmarkIcon },
  { key: 'activity', label: 'Activity', icon: HistoryIcon },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function formatDate(value: string | null, withTime = false): string {
  if (!value) return '—';
  const date = new Date(value);
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5 break-words">{value || '—'}</dd>
    </div>
  );
}

export function StaffDetailPage() {
  const { id } = useParams();
  const staffId = Number(id);
  // In the URL so a refresh or a shared link lands on the same tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'overview';
  const selectTab = (key: TabKey) => setSearchParams(key === 'overview' ? {} : { tab: key }, { replace: true });

  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [assignOfficeOpen, setAssignOfficeOpen] = useState(false);
  const [changeTypeOpen, setChangeTypeOpen] = useState(false);
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [staffData, officeData] = await Promise.all([usersApi.get(staffId), officesApi.list()]);
      setStaff(staffData);
      setOffices(officeData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load staff member.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const runAction = async (action: () => Promise<StaffUser>, successMessage: string) => {
    try {
      const updated = await action();
      setStaff(updated);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed.');
    }
  };

  if (loading || !staff) {
    return <div className="text-center text-gray-400 py-12">Loading…</div>;
  }

  const fullName = `${staff.firstName ?? ''} ${staff.lastName ?? ''}`.trim() || staff.email;

  const initials = (fullName || '?')
    .split(/[\s@]/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const roleLabel = staff.userType ? USER_TYPE_LABELS[staff.userType] ?? staff.userType : 'No role';

  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-heading font-bold">{initials}</div>
            <div>
              <h1 className="text-xl font-heading font-bold text-gray-900">{fullName}</h1>
              <p className="text-sm text-gray-500">
                {roleLabel} · {staff.officeName ?? 'Unassigned office'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={staff.onboardingStatus} />
            <StatusBadge status={staff.blocked ? 'Blocked' : 'Active'} />
          </div>
        </div>

        {staff.onboardingStatus === 'Declined' && staff.onboardingDeclinedReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">Declined: {staff.onboardingDeclinedReason}</div>
        )}
      </div>

      {staff.onboardingStatus === 'Pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-amber-800">This staff record is awaiting authorization before it can be used to log in.</p>
          <div className="flex gap-2">
            <button
              onClick={() => void runAction(() => usersApi.approveOnboarding(staffId), 'Onboarding approved.')}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-sm font-heading font-bold px-3 py-1.5 rounded-lg"
            >
              <CheckCircleIcon size={14} />
              Approve
            </button>
            <button onClick={() => setDeclineOpen(true)} className="flex items-center gap-1.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 text-sm font-heading font-bold px-3 py-1.5 rounded-lg">
              <XCircleIcon size={14} />
              Decline
            </button>
          </div>
        </div>
      )}

      

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div role="tablist" className="flex overflow-x-auto border-b border-gray-100 px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => selectTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-accent text-primary font-heading font-bold' : 'border-transparent text-gray-500 hover:text-primary'}`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'clients' && <StaffClientsTab staffId={staffId} />}
        {tab === 'loans' && <StaffLoansTab staffId={staffId} />}
        {tab === 'activity' && <StaffActivityTab staffId={staffId} />}

        {tab === 'overview' && (
          <div className="p-6 space-y-8">
            <section>
              <h2 className="text-sm font-heading font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Details</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <Detail label="First name" value={staff.firstName} />
                <Detail label="Last name" value={staff.lastName} />
                <Detail label="Gender" value={staff.gender === 'Unspecified' ? 'Not specified' : staff.gender} />
                <Detail label="Email" value={staff.email} />
                <Detail label="Phone" value={staff.phone} />
                <Detail label="Address" value={staff.address} />
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-heading font-bold text-gray-400 uppercase tracking-widest mb-4">Employment & Access</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <Detail label="Office" value={staff.officeName} />
                <Detail label="Role" value={staff.userType ? roleLabel : null} />
                <Detail label="Maker-checker class" value={staff.userClass} />
                <Detail label="Account created" value={formatDate(staff.createdAt)} />
                <Detail label="Created by" value={staff.createdByName} />
                <Detail label="Last updated" value={formatDate(staff.updatedAt, true)} />
                <Detail label="Updated by" value={staff.updatedByName} />
                <Detail label="Last login" value={formatDate(staff.lastLogin, true)} />
                {staff.onboardingStatus === 'Approved' && (
                  <>
                    <Detail label="Onboarding approved" value={formatDate(staff.onboardingApprovedDate)} />
                    <Detail label="Approved by" value={staff.onboardingApprovedByName} />
                  </>
                )}
                {staff.onboardingStatus === 'Declined' && <Detail label="Onboarding declined" value={formatDate(staff.onboardingDeclinedDate)} />}
              </dl>
              {staff.notes && (
                <div className="mt-4">
                  <Detail label="Notes" value={staff.notes} />
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <section className="bg-white rounded-xl border border-gray-100 p-6 mt-4">
        <h2 className="text-sm font-heading font-bold text-gray-400 uppercase tracking-widest mb-4">RBAC & Access Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => setAssignOfficeOpen(true)} className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-sm text-gray-700">
            <Building2Icon size={16} className="text-primary" />
            Reassign Office
          </button>
          <button onClick={() => setChangeTypeOpen(true)} className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-sm text-gray-700">
            <KeyRoundIcon size={16} className="text-primary" />
            Change Role (user_type)
          </button>
          <button onClick={() => setChangeClassOpen(true)} className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-sm text-gray-700">
            <KeyRoundIcon size={16} className="text-primary" />
            Change Maker-Checker Class
          </button>
          <button onClick={() => setResetPasswordOpen(true)} className="flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-sm text-gray-700">
            <KeyRoundIcon size={16} className="text-primary" />
            Reset Password
          </button>
          <button onClick={() => setBlockOpen(true)} className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${staff.blocked ? 'border-green-200 hover:bg-green-50 text-green-700' : 'border-red-200 hover:bg-red-50 text-red-600'}`}>
            {staff.blocked ? <UnlockIcon size={16} /> : <BanIcon size={16} />}
            {staff.blocked ? 'Unblock Account' : 'Block Account'}
          </button>
        </div>
      </section>

      <ConfirmationModal
        isOpen={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(reason) => {
          setDeclineOpen(false);
          void runAction(() => usersApi.declineOnboarding(staffId, reason ?? ''), 'Onboarding declined.');
        }}
        title="Decline onboarding"
        description="This staff record will remain blocked from logging in. Provide a reason for the record."
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel="Decline"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={assignOfficeOpen}
        onClose={() => setAssignOfficeOpen(false)}
        onConfirm={(officeId) => {
          setAssignOfficeOpen(false);
          if (!officeId) return;
          void runAction(() => usersApi.assignOffice(staffId, Number(officeId)), 'Office reassigned.');
        }}
        title="Reassign office"
        description={`Move ${fullName} to a different office/branch.`}
        inputType="select"
        inputLabel="Office"
        selectOptions={offices.map((o) => ({ label: o.name ?? `Office #${o.id}`, value: String(o.id) }))}
        requireInput
        confirmLabel="Reassign"
        confirmVariant="primary"
      />

      <ConfirmationModal
        isOpen={changeTypeOpen}
        onClose={() => setChangeTypeOpen(false)}
        onConfirm={(slug) => {
          setChangeTypeOpen(false);
          if (!slug) return;
          void runAction(() => usersApi.changeUserType(staffId, slug), 'Role updated.');
        }}
        title="Change role (user_type)"
        description={`Change ${fullName}'s RBAC role. This changes their effective permission set immediately.`}
        inputType="select"
        inputLabel="New role"
        selectOptions={USER_TYPE_SLUGS.map((slug) => ({ label: USER_TYPE_LABELS[slug], value: slug }))}
        requireInput
        confirmLabel="Change Role"
        confirmVariant="primary"
      />

      <ConfirmationModal
        isOpen={changeClassOpen}
        onClose={() => setChangeClassOpen(false)}
        onConfirm={(userClass) => {
          setChangeClassOpen(false);
          if (!userClass) return;
          void runAction(() => usersApi.changeUserClass(staffId, userClass as UserClass), 'Maker-checker class updated.');
        }}
        title="Change maker-checker class"
        description="Initiator creates records; Authorizer approves/declines what an Initiator of the same role created; Reviewer has read-only oversight."
        inputType="select"
        inputLabel="New class"
        selectOptions={[
          { label: 'Initiator', value: 'Initiator' },
          { label: 'Authorizer', value: 'Authorizer' },
          { label: 'Reviewer', value: 'Reviewer' },
        ]}
        requireInput
        confirmLabel="Change Class"
        confirmVariant="primary"
      />

      <ConfirmationModal
        isOpen={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        onConfirm={() => {
          setResetPasswordOpen(false);
          void runAction(() => usersApi.resetPassword(staffId), 'A new temporary password has been emailed to the staff member.');
        }}
        title="Reset password"
        description={`Generate a new temporary password for ${fullName} and email it to them.`}
        confirmLabel="Reset Password"
        confirmVariant="blue"
      />

      <ConfirmationModal
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        onConfirm={() => {
          setBlockOpen(false);
          if (staff.blocked) {
            void runAction(() => usersApi.unblock(staffId), 'Account unblocked.');
          } else {
            void runAction(() => usersApi.block(staffId), 'Account blocked.');
          }
        }}
        title={staff.blocked ? 'Unblock account' : 'Block account'}
        description={staff.blocked ? `${fullName} will be able to log in again.` : `${fullName} will be immediately prevented from logging in.`}
        confirmLabel={staff.blocked ? 'Unblock' : 'Block'}
        confirmVariant={staff.blocked ? 'primary' : 'danger'}
      />
    </div>
  );
}
