import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyRoundIcon,
  BanIcon,
  UnlockIcon,
  Building2Icon,
} from 'lucide-react';
import { usersApi, USER_TYPE_SLUGS, type StaffUser, type UserClass } from '../../api/usersApi';
import { officesApi, type Office } from '../../api/officesApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';

const USER_TYPE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  controller: 'Controller',
  director: 'Director',
  manager: 'Manager',
  marketer: 'Marketer',
};

export function StaffDetailPage() {
  const { id } = useParams();
  const staffId = Number(id);

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

  return (
    <div className="max-w-3xl">
      <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeftIcon size={14} />
        Back to Staff Directory
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-heading font-bold text-gray-900">{fullName}</h1>
            <p className="text-sm text-gray-500">{staff.email}</p>
            <p className="text-sm text-gray-500">{staff.phone || 'No phone on file'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <StatusBadge status={staff.onboardingStatus} />
              <StatusBadge status={staff.blocked ? 'Blocked' : 'Active'} />
            </div>
            <span className="text-xs text-gray-400">
              {staff.officeName ?? 'Unassigned office'} · {staff.userType ? USER_TYPE_LABELS[staff.userType] ?? staff.userType : 'No role'} · {staff.userClass ?? '—'}
            </span>
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

      <div className="bg-white rounded-xl border border-gray-100 p-6">
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
      </div>

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
