import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BadgeCheckIcon,
  BanIcon,
  CheckCircleIcon,
  FileTextIcon,
  HistoryIcon,
  LandmarkIcon,
  LockIcon,
  PauseCircleIcon,
  PiggyBankIcon,
  PlayCircleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UnlockIcon,
  UserIcon,
  UsersRoundIcon,
  XCircleIcon,
} from 'lucide-react';
import { clientsApi, editRequestsApi, GROUP_ROLE_LABELS, type ClientAuditEntry, type ClientDetail, type ClientGroupMembership } from '../../api/clientsApi';
import { deletionRequestsApi, type DeletionRequest } from '../../api/deletionRequestsApi';
import { StatusBadge, type StatusType } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { PassportPhoto } from '../../components/PassportPhoto';
import { formatMoney } from '../../utils/money';
import { formatDate } from '../../utils/format';
import { BiometricsView, ContactsView, DocumentsView, Empty, NextOfKinView, NotesView } from './ClientDocumentation';
import { useLoad } from '../../hooks/useLoad';
import { useClientSavings } from '../../hooks/useClientSavings';
import { SavingsSection } from './SavingsSection';

const TABS = [
  { key: 'overview', label: 'Overview', icon: UserIcon },
  { key: 'groups', label: 'Group Details', icon: UsersRoundIcon },
  { key: 'loans', label: 'Loan Record', icon: LandmarkIcon },
  { key: 'savings', label: 'Savings', icon: PiggyBankIcon },
  { key: 'audit', label: 'Audit trail', icon: HistoryIcon },
] as const;
type TabKey = (typeof TABS)[number]['key'];

type Dialog = 'decline' | 'mark-safe' | 'deactivate' | 'close' | 'delete' | 'grant-edit' | 'refuse-edit' | 'approve-deletion' | 'reject-deletion' | null;

function clientName(client: Pick<ClientDetail, 'displayName' | 'firstName' | 'middleName' | 'lastName'>): string {
  return [client.firstName, client.middleName, client.lastName].filter(Boolean).join(' ') || client.displayName || 'Unnamed client';
}

/**
 * A client's page, laid out as in the office portal — photo, key details and statuses, then tabs for
 * their overview and documentation, groups, loans and audit trail — with the super admin's actions:
 * approving, declining and marking safe, reviewing edit and deletion requests, and changing status.
 * Documentation is read-only here; the staff member who onboarded the client changes it.
 */
export function ClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : 'overview';

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [savingsVersion, setSavingsVersion] = useState(0);
  const savings = useClientSavings(clientId, savingsVersion);

  const load = async () => {
    try {
      const loaded = await clientsApi.detail(clientId);
      setClient(loaded);
      setDeletionRequest(loaded.pendingDeletionRequest ? await deletionRequestsApi.pendingFor('client', clientId).catch(() => null) : null);
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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
        <p className="text-gray-500">This client doesn't exist or was deleted.</p>
        <Link to="/clients" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to clients
        </Link>
      </div>
    );
  }

  if (!client) {
    return <p className="py-12 text-center text-sm text-gray-400">Loading…</p>;
  }

  const name = clientName(client);
  const actions = client.actions;
  const editRequest = client.currentEditRequest;
  const buttonClass = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const blockers = client.approvalBlockers ?? [];

  return (
    <div className="max-w-6xl space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <PassportPhoto clientId={client.id} name={name} hasPhoto={client.hasPhoto} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-gray-900">{name}</h1>
              <StatusBadge status={client.status as StatusType} />
              {client.isHighRisk && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  <ShieldAlertIcon size={12} /> High risk
                </span>
              )}
              {client.bvnVerifiedAt && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <BadgeCheckIcon size={12} /> BVN verified
                </span>
              )}
              {client.pendingDeletionRequest && <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Deletion requested</span>}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              A/C {client.accountNo ?? '—'} · {client.officeName ?? 'No office'}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              <Brief label="Phone" value={client.mobile ?? client.phone} />
              <Brief label="Email" value={client.email} />
              <Brief label="BVN" value={client.bvn ? `•••••••${client.bvn.slice(-4)}` : null} />
              <Brief label="Joined" value={formatDate(client.joinedDate)} />
              <Brief label="Active loan" value={client.activeLoan ?? 'None'} />
              <Brief label="Savings" value={savings ? formatMoney(savings.balance) : null} />
              <Brief label="Onboarded by" value={client.createdByName} />
              <Brief label="Approved" value={client.activatedDate ? `${formatDate(client.activatedDate)}${client.activatedByName ? ` · ${client.activatedByName}` : ''}` : null} />
            </dl>
          </div>
        </div>

        {client.isHighRisk && (
          <Banner tone="red" icon={<ShieldAlertIcon size={18} />} title="Flagged high risk">
            Onboarded with details that differ from their BVN record. Reason given: “{client.highRiskReason ?? '—'}”. They can't be approved until they're marked safe.
            {actions?.canMarkSafe && (
              <Buttons>
                <button onClick={() => setDialog('mark-safe')} className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
                  Mark safe
                </button>
              </Buttons>
            )}
          </Banner>
        )}

        {editRequest?.status === 'pending' && (
          <Banner tone="sky" icon={<LockIcon size={18} />} title="Edit privilege requested">
            {editRequest.requestedByName ?? 'Staff'} asked on {formatDate(editRequest.createdAt)}: “{editRequest.reason}”.
            {actions?.canReviewEditRequests && (
              <Buttons>
                <button onClick={() => setDialog('refuse-edit')} className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-medium text-sky-900 hover:bg-sky-100">
                  Refuse
                </button>
                <button onClick={() => setDialog('grant-edit')} className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800">
                  Grant
                </button>
              </Buttons>
            )}
          </Banner>
        )}

        {actions?.editPrivilegeOpen && (
          <Banner tone="amber" icon={<UnlockIcon size={18} />} title="Edit privilege granted.">
            {client.status === 'Pending'
              ? 'The profile was edited, so the client is pending approval again. Editing stays open until they are approved.'
              : `${editRequest?.requestedByName ?? 'The requester'} can edit the profile. Saving any change sends the client back to pending approval.`}
          </Banner>
        )}

        {deletionRequest && (
          <Banner tone="gray" icon={<Trash2Icon size={18} />} title="Deletion requested">
            {deletionRequest.requestedByName ?? 'Staff'} asked on {formatDate(deletionRequest.createdAt)}: “{deletionRequest.reason}”.
            <Buttons>
              <button onClick={() => setDialog('reject-deletion')} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Reject
              </button>
              <button onClick={() => setDialog('approve-deletion')} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                Approve & delete
              </button>
            </Buttons>
          </Banner>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
          {client.status === 'Pending' && !client.isHighRisk && blockers.length > 0 && (
            <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">To approve, the client needs {blockers.join(' and ')}.</span>
          )}
          {actions?.canApprove && (
            <button onClick={() => void run(() => clientsApi.approve(client.id), `${name} approved.`)} className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}>
              <CheckCircleIcon size={16} /> Approve
            </button>
          )}
          {actions?.canDecline && (
            <button onClick={() => setDialog('decline')} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <XCircleIcon size={16} /> Decline
            </button>
          )}
          {actions?.canMarkSafe && (
            <button onClick={() => setDialog('mark-safe')} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <ShieldCheckIcon size={16} /> Mark safe
            </button>
          )}
          {client.status === 'Active' && (
            <button onClick={() => setDialog('deactivate')} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <PauseCircleIcon size={16} /> Deactivate
            </button>
          )}
          {client.status === 'Inactive' && (
            <button onClick={() => void run(() => clientsApi.reactivate(client.id), `${name} reactivated.`)} className={`${buttonClass} border border-gray-200 text-gray-700 hover:bg-gray-50`}>
              <PlayCircleIcon size={16} /> Reactivate
            </button>
          )}
          {(client.status === 'Active' || client.status === 'Inactive') && (
            <button onClick={() => setDialog('close')} className={`${buttonClass} border border-gray-200 text-red-600 hover:bg-red-50`}>
              <BanIcon size={16} /> Close
            </button>
          )}
          {actions?.canDelete && (
            <button onClick={() => setDialog('delete')} className={`${buttonClass} border border-red-200 text-red-600 hover:bg-red-50`}>
              <Trash2Icon size={16} /> Delete
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div role="tablist" className="flex overflow-x-auto border-b border-gray-100 px-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setSearchParams(t.key === 'overview' ? {} : { tab: t.key }, { replace: true })}
              className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                tab === t.key ? 'border-accent font-heading font-bold text-primary' : 'border-transparent text-gray-500 hover:text-primary'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && <OverviewTab client={client} />}
          {tab === 'groups' && <GroupsTab clientId={client.id} />}
          {tab === 'loans' && <LoansTab clientId={client.id} />}
          {tab === 'savings' && <SavingsSection clientId={client.id} onChange={() => setSavingsVersion((v) => v + 1)} />}
          {tab === 'audit' && <AuditTab clientId={client.id} />}
        </div>
      </section>

      <ConfirmationModal
        isOpen={dialog === 'decline'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => void run(() => clientsApi.decline(client.id, reason ?? ''), `${name} declined.`)}
        title="Decline client"
        description="The client moves to Declined. Give the reason for the record."
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel="Decline"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'mark-safe'}
        onClose={() => setDialog(null)}
        onConfirm={(note) => void run(() => clientsApi.markSafe(client.id, note?.trim() || null), `${name} marked safe — they can now be approved.`)}
        title={`Mark ${name} safe?`}
        description={`Reason given for keeping details that differ from the BVN: “${client.highRiskReason ?? '—'}”. Marking them safe lets them be approved.`}
        inputType="textarea"
        inputLabel="Note (optional) — e.g. what you checked"
        confirmLabel="Mark safe"
      />
      <ConfirmationModal
        isOpen={dialog === 'deactivate' || dialog === 'close'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) =>
          void run(
            () => (dialog === 'close' ? clientsApi.close(client.id, reason ?? '') : clientsApi.deactivate(client.id, reason ?? '')),
            dialog === 'close' ? `${name} closed.` : `${name} deactivated.`,
          )
        }
        title={dialog === 'close' ? 'Close client' : 'Deactivate client'}
        description={dialog === 'close' ? 'Closing is final.' : 'The client moves to Inactive until reactivated.'}
        inputType="textarea"
        inputLabel="Reason"
        requireInput
        confirmLabel={dialog === 'close' ? 'Close' : 'Deactivate'}
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={() => void run(() => clientsApi.remove(client.id), `${name} deleted.`, () => navigate('/clients'))}
        title="Delete client"
        description={`${name} has never been approved, so they can be deleted straight away. They'll be removed from any groups.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'grant-edit'}
        onClose={() => setDialog(null)}
        onConfirm={(note) => editRequest && void run(() => editRequestsApi.approve(editRequest.id, note?.trim() || null), 'Edit privilege granted.')}
        title="Grant edit privilege"
        description={`${editRequest?.requestedByName ?? 'The requester'} will be able to edit ${name}'s profile. The first saved edit sends the client back to pending approval.`}
        inputType="textarea"
        inputLabel="Note (optional)"
        confirmLabel="Grant"
      />
      <ConfirmationModal
        isOpen={dialog === 'refuse-edit'}
        onClose={() => setDialog(null)}
        onConfirm={(note) => editRequest && void run(() => editRequestsApi.reject(editRequest.id, note ?? ''), 'Edit request refused.')}
        title="Refuse edit request"
        description="The profile stays locked. Tell the requester why."
        inputType="textarea"
        inputLabel="Why is it refused?"
        requireInput
        confirmLabel="Refuse"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={dialog === 'approve-deletion'}
        onClose={() => setDialog(null)}
        onConfirm={(note) => deletionRequest && void run(() => deletionRequestsApi.approve(deletionRequest.id, note?.trim() || null), `${name} deleted.`, () => navigate('/clients'))}
        title={`Delete ${name}?`}
        description="Approving the request deletes the client. This can't be undone from the portal."
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
        description="The client stays. Tell the requester why."
        inputType="textarea"
        inputLabel="Why is it rejected?"
        requireInput
        confirmLabel="Reject"
        confirmVariant="danger"
      />
    </div>
  );
}

const BANNER_TONES = {
  red: 'border-red-200 bg-red-50 text-red-800',
  sky: 'border-sky-200 bg-sky-50 text-sky-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  gray: 'border-gray-200 bg-gray-50 text-gray-800',
} as const;

/** A notice under the client's details — something waiting on the super admin, or a state to know about. */
function Banner({ tone, icon, title, children }: { tone: keyof typeof BANNER_TONES; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={`mt-5 flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm ${BANNER_TONES[tone]}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-bold">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function Buttons({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex gap-2">{children}</div>;
}

function Brief({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-gray-800" title={value ?? undefined}>
        {value || '—'}
      </dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-gray-800">{value || '—'}</dd>
    </div>
  );
}

const DOC_SECTIONS = [
  { key: 'biometrics', label: 'Biometrics' },
  { key: 'documents', label: 'Documents' },
  { key: 'guarantors', label: 'Guarantors' },
  { key: 'references', label: 'References' },
  { key: 'next-of-kin', label: 'Next of kin' },
  { key: 'notes', label: 'Notes' },
] as const;
type DocSection = (typeof DOC_SECTIONS)[number]['key'];

function OverviewTab({ client }: { client: ClientDetail }) {
  const [section, setSection] = useState<DocSection>('biometrics');
  const address = [client.address, client.street, client.city, client.state, client.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xs font-heading font-bold uppercase tracking-widest text-gray-400">Personal details</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="First name" value={client.firstName} />
          <Detail label="Middle name" value={client.middleName} />
          <Detail label="Last name" value={client.lastName} />
          <Detail label="Gender" value={client.gender} />
          <Detail label="Date of birth" value={client.dob ? formatDate(client.dob) : null} />
          <Detail label="Marital status" value={client.maritalStatus} />
          <Detail label="Occupation" value={client.occupation} />
          <Detail label="Client type" value={client.clientType} />
          <Detail label="Mobile" value={client.mobile} />
          <Detail label="Email" value={client.email} />
          <div className="sm:col-span-2">
            <Detail label="Address" value={address} />
          </div>
          {client.status === 'Declined' && <Detail label="Declined reason" value={client.declinedReason} />}
          {client.status === 'Inactive' && <Detail label="Inactive reason" value={client.inactiveReason} />}
          {client.status === 'Closed' && <Detail label="Closed reason" value={client.closedReason} />}
        </dl>
      </section>

      <section>
        <h2 className="mb-4 text-xs font-heading font-bold uppercase tracking-widest text-gray-400">BVN verification & risk</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="BVN" value={client.bvn} />
          <Detail label="Verified" value={client.bvnVerifiedAt ? formatDate(client.bvnVerifiedAt, true) : 'Not verified (onboarded before BVN checks)'} />
          <Detail label="Details on file" value={client.bvnDetailsSource === 'client' ? "Client's own (differ from BVN)" : client.bvnDetailsSource === 'bvn' ? 'From the BVN record' : null} />
          <Detail label="Risk" value={client.isHighRisk ? 'High risk' : client.highRiskClearedAt ? `Marked safe ${formatDate(client.highRiskClearedAt)}` : 'Normal'} />
          {client.highRiskReason && <Detail label="Reason for keeping client's details" value={client.highRiskReason} />}
          {client.highRiskClearedNote && <Detail label="Super admin's note" value={client.highRiskClearedNote} />}
        </dl>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-heading font-bold uppercase tracking-widest text-gray-400">Documentation</h2>
          <p className="inline-flex items-center gap-1 text-xs text-gray-400">
            <LockIcon size={12} /> Read-only — {client.createdByName ?? 'the staff member who onboarded the client'} changes it from the office portal.
          </p>
        </div>
        <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {DOC_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${section === s.key ? 'bg-white font-medium text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {section === 'biometrics' && <BiometricsView clientId={client.id} clientName={clientName(client)} />}
        {section === 'documents' && <DocumentsView clientId={client.id} />}
        {(section === 'guarantors' || section === 'references') && <ContactsView key={section} clientId={client.id} kind={section} />}
        {section === 'next-of-kin' && <NextOfKinView clientId={client.id} />}
        {section === 'notes' && <NotesView clientId={client.id} />}
      </section>
    </div>
  );
}

function GroupsTab({ clientId }: { clientId: number }) {
  const { data, failed } = useLoad<ClientGroupMembership[]>(() => clientsApi.groups(clientId), [clientId]);
  if (failed) return <Empty>Couldn't load the client's groups.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  if (data.length === 0) return <Empty>This client isn't in any group.</Empty>;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {data.map((membership) => (
        <Link
          key={membership.groupId}
          to={`/groups/${membership.groupId}`}
          className="group flex items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UsersRoundIcon size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-heading font-semibold text-gray-800 group-hover:text-primary">{membership.groupName ?? `Group #${membership.groupId}`}</span>
            <span className="block text-xs text-gray-500">
              {GROUP_ROLE_LABELS[membership.role ?? 'member'] ?? 'Member'} · joined {formatDate(membership.joinedAt)}
            </span>
          </span>
          <StatusBadge status={membership.status as StatusType} />
        </Link>
      ))}
    </div>
  );
}

function LoansTab({ clientId }: { clientId: number }) {
  const { data, failed } = useLoad(() => clientsApi.loans(clientId), [clientId]);
  if (failed) return <Empty>Couldn't load the client's loans.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  if (data.items.length === 0) return <Empty>No loans on record for this client.</Empty>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Loan</th>
            <th className="px-4 py-3 font-medium text-right">Requested</th>
            <th className="px-4 py-3 font-medium text-right">Approved</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.items.map((loan) => (
            <tr key={loan.id}>
              <td className="px-4 py-3">
                <Link to={`/loans/${loan.id}`} className="font-medium text-primary hover:underline">
                  {loan.accountNumber ?? `Loan #${loan.id}`}
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatMoney(loan.appliedAmount)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{loan.approvedAmount === null ? '—' : formatMoney(loan.approvedAmount)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={loan.status as StatusType} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Turns an audit entry's JSON notes into a short readable line. */
function describeNotes(notes: string | null): string | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([key]) => !['UpdatedAt', 'CreatedAt'].includes(key))
      .map(([key, value]) => {
        if (value && typeof value === 'object' && 'after' in (value as object)) {
          const change = value as { before: unknown; after: unknown };
          return `${key}: ${change.before ?? '—'} → ${change.after ?? '—'}`;
        }
        return `${key}: ${Array.isArray(value) ? value.map((v) => JSON.stringify(v)).join(', ') || '—' : String(value ?? '—')}`;
      })
      .join(' · ');
  } catch {
    return notes;
  }
}

function AuditTab({ clientId }: { clientId: number }) {
  const { data, failed } = useLoad<ClientAuditEntry[]>(() => clientsApi.audit(clientId), [clientId]);
  if (failed) return <Empty>Couldn't load the audit trail.</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  if (data.length === 0) return <Empty>Nothing recorded yet.</Empty>;

  return (
    <ol className="relative space-y-5 border-l border-gray-200 pl-6">
      {data.map((entry, index) => (
        <li key={entry.id ?? `created-${index}`} className="relative">
          <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-primary/70" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-gray-800">
              <FileTextIcon size={13} className="mr-1 inline text-gray-400" />
              {entry.module === 'DeletionRequest' ? `Deletion request — ${entry.action?.toLowerCase()}` : entry.action}
            </p>
            <p className="text-xs text-gray-400">{formatDate(entry.at, true)}</p>
          </div>
          <p className="text-xs text-gray-500">{entry.userName ?? 'System'}</p>
          {describeNotes(entry.notes) && <p className="mt-1 break-words text-xs text-gray-500">{describeNotes(entry.notes)}</p>}
        </li>
      ))}
    </ol>
  );
}
