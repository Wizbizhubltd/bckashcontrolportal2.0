import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircleIcon, Trash2Icon, UserIcon, UsersRoundIcon, XCircleIcon } from 'lucide-react';
import { deletionRequestsApi, type DeletionRequest, type DeletionRequestStatus } from '../../api/deletionRequestsApi';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Pagination } from '../../components/Pagination';

const PAGE_SIZE = 15;

const FILTERS: { value: DeletionRequestStatus | null; label: string }[] = [
  { value: 'Pending', label: 'Awaiting review' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: null, label: 'All' },
];

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

/**
 * Requests from office staff to delete an approved client, or a group with an approved member —
 * neither can be deleted directly. Approving deletes the record; rejecting needs a note for the requester.
 */
export function DeletionRequestsPage() {
  const [status, setStatus] = useState<DeletionRequestStatus | null>('Pending');
  const [items, setItems] = useState<DeletionRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<DeletionRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DeletionRequest | null>(null);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await deletionRequestsApi.list(status, pageToLoad, PAGE_SIZE);
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load deletion requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const review = async (request: DeletionRequest, approve: boolean, note: string | undefined) => {
    setApproveTarget(null);
    setRejectTarget(null);
    try {
      if (approve) {
        await deletionRequestsApi.approve(request.id, note?.trim() || null);
        toast.success(`${request.entityName ?? 'The record'} deleted.`);
      } else {
        await deletionRequestsApi.reject(request.id, note ?? '');
        toast.success('Request rejected.');
      }
      void load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The request could not be reviewed.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Deletion Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Approved clients, and groups with an approved member, can only be deleted here — office staff raise a request with a reason.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            onClick={() => setStatus(filter.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${status === filter.value ? 'bg-white font-medium text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">To delete</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Requested by</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    {status === 'Pending' ? 'No requests are waiting for review.' : 'No requests found.'}
                  </td>
                </tr>
              ) : (
                items.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {request.entityType === 'group' ? <UsersRoundIcon size={16} className="text-gray-400" /> : <UserIcon size={16} className="text-gray-400" />}
                        <span className="font-medium text-gray-800">{request.entityName ?? `#${request.entityId}`}</span>
                      </div>
                      <span className="block pl-6 text-xs text-gray-400">
                        {request.entityType === 'group' ? 'Group' : 'Client'} · {request.officeName ?? 'No office'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-sm">
                      {request.reason}
                      {request.reviewNote && <span className="mt-1 block text-xs text-gray-500">Review note: {request.reviewNote}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {request.requestedByName ?? '—'}
                      <span className="block text-xs text-gray-400">{formatDateTime(request.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={request.status} />
                      {request.reviewedByName && (
                        <span className="mt-1 block text-xs text-gray-400">
                          {request.reviewedByName} · {formatDateTime(request.reviewedAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setRejectTarget(request)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            <XCircleIcon size={14} /> Reject
                          </button>
                          <button
                            onClick={() => setApproveTarget(request)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            <CheckCircleIcon size={14} /> Approve & delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={(p) => void load(p)} />
      </div>

      <ConfirmationModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={(note) => approveTarget && void review(approveTarget, true, note)}
        title={`Delete ${approveTarget?.entityName ?? 'this record'}?`}
        description={
          approveTarget?.entityType === 'group'
            ? `The group and its memberships are deleted; its clients stay on the platform. Reason given: “${approveTarget?.reason}”`
            : `The client is deleted and removed from their groups. Reason given: “${approveTarget?.reason ?? ''}”`
        }
        icon={<Trash2Icon size={20} className="text-red-600" />}
        inputType="textarea"
        inputLabel="Note (optional)"
        confirmLabel="Approve & delete"
        confirmVariant="danger"
      />
      <ConfirmationModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={(note) => rejectTarget && void review(rejectTarget, false, note)}
        title="Reject deletion request"
        description={`${rejectTarget?.entityName ?? 'The record'} stays as it is. Tell ${rejectTarget?.requestedByName ?? 'the requester'} why.`}
        inputType="textarea"
        inputLabel="Why is it rejected?"
        requireInput
        confirmLabel="Reject"
        confirmVariant="primary"
      />
    </div>
  );
}
