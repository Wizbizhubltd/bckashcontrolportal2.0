import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BanIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  CrownIcon,
  HourglassIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserCogIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
} from 'lucide-react';
import { groupsApi, type GroupProfile, type GroupSummary } from '../../api/groupsApi';
import { GROUP_ROLE_LABELS } from '../../api/clientsApi';
import { usersApi } from '../../api/usersApi';
import { officesApi, type Office } from '../../api/officesApi';
import { deletionRequestsApi, type DeletionRequest } from '../../api/deletionRequestsApi';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';
import { StatCard } from '../../components/StatCard';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { OfficeScopedPickerModal } from '../../components/OfficeScopedPickerModal';
import { formatMoney } from '../../utils/money';
import { formatDate, humanize, initials } from '../../utils/format';

type Dialog = 'disable' | 'close' | 'delete' | 'reassign' | 'approve-deletion' | 'reject-deletion' | null;

const count = new Intl.NumberFormat('en-NG');

/**
 * A group's page, laid out as in the office portal — loan totals, member counts, the roster and loan
 * records — with the super admin's actions: disabling, enabling or closing the group, handing it to
 * another marketer, deleting a never-approved group, and reviewing a deletion request.
 */
export function GroupDetailPage() {
  const navigate = useNavigate();
  const groupId = Number(useParams<{ id: string }>().id);
  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [summary, setSummary] = useState<GroupSummary | null>(null);
  const [marketerName, setMarketerName] = useState<string | null>(null);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = async () => {
    try {
      const [profile, figures] = await Promise.all([groupsApi.get(groupId), groupsApi.summary(groupId)]);
      setGroup(profile);
      setSummary(figures);
      setMarketerName(
        profile.staffId
          ? await usersApi
              .get(profile.staffId)
              .then((u) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email)
              .catch(() => null)
          : null,
      );
      setDeletionRequest(figures.pendingDeletionRequest ? await deletionRequestsApi.pendingFor('group', groupId).catch(() => null) : null);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    void load();
    void officesApi.list().then(setOffices).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const run = async (action: () => Promise<unknown>, success: string, after?: () => void) => {
    setDialog(null);
    try {
      await action();
      toast.success(success);
      if (after) after();
      else await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed.');
    }
  };

  if (notFound) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">This group doesn't exist or was deleted.</p>
        <Link to="/clients?tab=groups" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to groups
        </Link>
      </div>
    );
  }

  if (!group || !summary) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading…</p>;
  }

  const name = group.name ?? `Group #${group.id}`;
  const buttonClass = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const closable = group.status === 'Pending' || group.status === 'Active' || group.status === 'Inactive';

  const loadMarketers = async (office: number) => {
    const marketers = await usersApi.list({ userType: 'marketer', officeId: office, pageSize: 100 });
    return marketers.items
      .filter((m) => !m.blocked && m.id !== group.staffId)
      .map((m) => ({ label: `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email, value: String(m.id) }));
  };

  return (
    <div className="max-w-6xl space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UsersRoundIcon size={26} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-gray-900">{name}</h1>
                <StatusBadge status={group.status as StatusType} />
                {summary.pendingDeletionRequest && <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Deletion requested</span>}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {group.accountNo ? `A/C ${group.accountNo} · ` : ''}
                {summary.officeName ?? 'No office'}
                {summary.createdByName ? ` · onboarded by ${summary.createdByName}` : ''}
              </p>
            </div>
          </div>
        </div>

        {group.status === 'Pending' && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <HourglassIcon size={16} />
            Awaiting approval — the group is approved automatically once all {summary.totalMembers} members are ({summary.approvedMembers} so far).
          </p>
        )}
        {group.status === 'Inactive' && group.inactiveReason && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
            <PauseCircleIcon size={16} /> Disabled: {group.inactiveReason}
          </p>
        )}
        {group.status === 'Closed' && group.closedReason && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
            <BanIcon size={16} /> Closed: {group.closedReason}
          </p>
        )}

        {deletionRequest && (
          <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <Trash2Icon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold">Deletion requested</p>
              <p className="mt-0.5">
                {deletionRequest.requestedByName ?? 'Staff'} asked on {formatDate(deletionRequest.createdAt)}: “{deletionRequest.reason}”.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setDialog('reject-deletion')} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Reject
                </button>
                <button onClick={() => setDialog('approve-deletion')} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                  Approve & delete
                </button>
              </div>
            </div>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-5">
          <Brief label="Marketer" value={marketerName} />
          <Brief label="Phone" value={group.mobile ?? group.phone} />
          <Brief label="Email" value={group.email} />
          <Brief label="Meeting address" value={group.address} />
          <Brief label="Approved" value={group.activatedDate ? formatDate(group.activatedDate) : null} />
        </dl>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
          {group.status !== 'Closed' && group.status !== 'Declined' && (
            <button onClick={() => setDialog('reassign')} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <UserCogIcon size={16} /> Reassign to a marketer
            </button>
          )}
          {group.status === 'Active' && (
            <button onClick={() => setDialog('disable')} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <PauseCircleIcon size={16} /> Disable
            </button>
          )}
          {group.status === 'Inactive' && (
            <button onClick={() => void run(() => groupsApi.enable(group.id), `${name} enabled.`)} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <PlayCircleIcon size={16} /> Enable
            </button>
          )}
          {closable && (
            <button onClick={() => setDialog('close')} className={`${buttonClass} border border-gray-200 text-red-600 hover:bg-red-50`}>
              <BanIcon size={16} /> Close
            </button>
          )}
          {summary.canDelete && (
            <button onClick={() => setDialog('delete')} className={`${buttonClass} border border-red-200 text-red-600 hover:bg-red-50`}>
              <Trash2Icon size={16} /> Delete group
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={BanknoteIcon} tone="primary" label="Cumulative loans" value={formatMoney(summary.cumulativeLoanAmount, 0)} sublabel={`${count.format(summary.cumulativeLoanCount)} loan${summary.cumulativeLoanCount === 1 ? '' : 's'} across members`} />
        <StatCard icon={WalletIcon} tone="danger" label="Pending repayment" value={formatMoney(summary.pendingRepaymentAmount, 0)} sublabel="Still owed on running loans" />
        <StatCard icon={UsersIcon} tone="neutral" label="Total members" value={count.format(summary.totalMembers)} sublabel="In the group now" />
        <StatCard icon={CheckCircle2Icon} tone="success" label="Approved" value={count.format(summary.approvedMembers)} sublabel="Members approved" />
        <StatCard icon={HourglassIcon} tone="warning" label="Pending" value={count.format(summary.pendingMembers)} sublabel="Awaiting approval" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <h2 className="border-b border-gray-100 px-5 py-4 font-heading text-sm font-semibold text-gray-800">Members</h2>
        {summary.members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No members in this group.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium text-right">Loans</th>
                  <th className="px-5 py-3 font-medium text-right">Pending repayment</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.members.map((member) => {
                  const memberName = member.displayName || `Client #${member.clientId}`;
                  const leadership = member.role && member.role !== 'member';
                  return (
                    <tr key={member.clientId} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/clients/${member.clientId}`)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">{initials(memberName)}</span>
                          <div>
                            <Link to={`/clients/${member.clientId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-primary hover:underline">
                              {memberName}
                            </Link>
                            <span className="block text-xs text-gray-400">{member.accountNo ? `A/C ${member.accountNo}` : '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${leadership ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                          {member.role === 'leader' && <CrownIcon size={12} />}
                          {GROUP_ROLE_LABELS[member.role ?? 'member'] ?? 'Member'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatMoney(member.loanAmount, 0)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatMoney(member.pendingRepayment, 0)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={member.status as StatusType} />
                          {member.isHighRisk && (
                            <span title="High risk" className="text-red-600">
                              <ShieldAlertIcon size={16} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-heading text-sm font-semibold text-gray-800">Loan records</h2>
          <span className="text-xs text-gray-400">Every member's loans and loan applications, and the group's own</span>
        </div>
        {summary.loanRecords.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No loans or loan applications for this group's members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Record</th>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.loanRecords.map((record) => (
                  <tr key={`${record.kind}-${record.id}`}>
                    <td className="px-5 py-3">
                      <Link to={record.kind === 'loan' ? `/loans/${record.id}` : `/loan-applications/${record.id}`} className="font-medium text-primary hover:underline">
                        {record.reference}
                      </Link>
                      <span className="block text-xs text-gray-400">{record.kind === 'loan' ? 'Loan' : 'Application'}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {record.clientId ? (
                        <Link to={`/clients/${record.clientId}`} className="hover:text-primary hover:underline">
                          {record.clientName ?? `Client #${record.clientId}`}
                        </Link>
                      ) : (
                        <span>{record.clientName ?? 'Group loan'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{record.loanProductName ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatMoney(record.amount, 0)}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">{humanize(record.status)}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(record.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog === 'reassign' && (
        <OfficeScopedPickerModal
          title={`Reassign ${name} to a marketer`}
          description="The group and every client currently in it move to the marketer, who must work in the group's office."
          pickLabel="Marketer"
          confirmLabel="Reassign"
          offices={offices}
          defaultOfficeId={group.officeId}
          loadOptions={loadMarketers}
          onConfirm={(marketerId) =>
            void run(async () => {
              const result = await groupsApi.bulkReassignMarketer([group.id], Number(marketerId));
              if (result.succeeded === 0) throw new Error(result.skipped[0]?.reason ?? 'The group could not be reassigned.');
            }, `${name} reassigned, along with its members.`)
          }
          onClose={() => setDialog(null)}
        />
      )}

      <ConfirmationModal
        isOpen={dialog === 'disable' || dialog === 'close'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          void run(
            () => (dialog === 'close' ? groupsApi.close(group.id, reason ?? '') : groupsApi.disable(group.id, reason ?? '')),
            dialog === 'close' ? `${name} closed.` : `${name} disabled.`,
          )
        }
        title={dialog === 'close' ? 'Close group' : 'Disable group'}
        description={dialog === 'close' ? 'Closing is final.' : 'The group stays on record with its members but is marked inactive until it is enabled again.'}
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel={dialog === 'close' ? 'Close' : 'Disable'}
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={() => void run(() => groupsApi.remove(group.id), `${name} deleted.`, () => navigate('/clients?tab=groups'))}
        title="Delete group"
        description="None of its members has been approved, so the group can be deleted straight away. Its clients stay on the platform as individual clients."
        confirmLabel="Delete group"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'approve-deletion'}
        onClose={() => setDialog(null)}
        onConfirm={(note) =>
          deletionRequest && void run(() => deletionRequestsApi.approve(deletionRequest.id, note?.trim() || null), `${name} deleted.`, () => navigate('/clients?tab=groups'))
        }
        title={`Delete ${name}?`}
        description="Approving the request deletes the group. Its clients stay on the platform as individual clients."
        inputType="textarea"
        inputLabel="Note (optional)"
        confirmLabel="Approve & delete"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'reject-deletion'}
        onClose={() => setDialog(null)}
        onConfirm={(note) => deletionRequest && void run(() => deletionRequestsApi.reject(deletionRequest.id, note ?? ''), 'Deletion request rejected.')}
        title="Reject deletion request"
        description="The group stays. Tell the requester why."
        inputType="textarea"
        inputLabel="Why is it rejected?"
        requireInput
        confirmLabel="Reject"
        confirmVariant="danger"
      />
    </div>
  );
}

function Brief({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-gray-800">{value || '—'}</dd>
    </div>
  );
}
