import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { editRequestsApi, type ClientEditRequest } from '../../api/clientsApi';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { Pagination } from '../../components/Pagination';
import { formatDate } from '../../utils/format';

const PAGE_SIZE = 15;

type Filter = ClientEditRequest['status'] | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Granted' },
  { value: 'rejected', label: 'Refused' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
];

const STATUS_STYLES: Record<ClientEditRequest['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS: Record<ClientEditRequest['status'], string> = {
  pending: 'Pending',
  approved: 'Granted',
  rejected: 'Refused',
  completed: 'Completed',
};

/**
 * Requests from office staff to edit an approved client, whose profile is otherwise locked. Granting
 * reopens the profile to the requester; the first saved edit sends the client back to pending
 * approval. Refusing needs a note for the requester.
 */
export function EditRequestsPage() {
  const [status, setStatus] = useState<Filter>('pending');
  const [items, setItems] = useState<ClientEditRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [grantTarget, setGrantTarget] = useState<ClientEditRequest | null>(null);
  const [refuseTarget, setRefuseTarget] = useState<ClientEditRequest | null>(null);

  const load = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const result = await editRequestsApi.list(status, pageToLoad, PAGE_SIZE);
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPage(result.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load edit requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const review = async (request: ClientEditRequest, grant: boolean, note: string | undefined) => {
    setGrantTarget(null);
    setRefuseTarget(null);
    try {
      if (grant) {
        await editRequestsApi.approve(request.id, note?.trim() || null);
        toast.success(`Edit privilege granted for ${request.clientName ?? 'the client'}.`);
      } else {
        await editRequestsApi.reject(request.id, note ?? '');
        toast.success('Request refused.');
      }
      void load(page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The request could not be reviewed.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-primary">Edit Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          An approved client's profile is locked. Office staff ask here to edit one; granting reopens it, and the first saved edit sends the client back to pending approval.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
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
                <th className="px-4 py-3 font-medium">Client</th>
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
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">{status === 'pending' ? 'No requests are waiting for review.' : 'No requests found.'}</td>
                </tr>
              ) : (
                items.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/clients/${request.clientId}`} className="font-medium text-primary hover:underline">
                        {request.clientName?.trim() || `Client #${request.clientId}`}
                      </Link>
                      <span className="block text-xs text-gray-400">
                        {request.clientAccountNo ? `A/C ${request.clientAccountNo} · ` : ''}
                        {request.officeName ?? 'No office'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-sm">
                      {request.reason}
                      {request.reviewNote && <span className="mt-1 block text-xs text-gray-500">Review note: {request.reviewNote}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {request.requestedByName ?? '—'}
                      <span className="block text-xs text-gray-400">{formatDate(request.createdAt, true)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[request.status]}`}>{STATUS_LABELS[request.status]}</span>
                      {request.reviewedByName && (
                        <span className="mt-1 block text-xs text-gray-400">
                          {request.reviewedByName} · {formatDate(request.reviewedAt, true)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setRefuseTarget(request)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            <XCircleIcon size={14} /> Refuse
                          </button>
                          <button
                            onClick={() => setGrantTarget(request)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                          >
                            <CheckCircleIcon size={14} /> Grant
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
        isOpen={!!grantTarget}
        onClose={() => setGrantTarget(null)}
        onConfirm={(note) => grantTarget && void review(grantTarget, true, note)}
        title="Grant edit privilege"
        description={`${grantTarget?.requestedByName ?? 'The requester'} will be able to edit ${grantTarget?.clientName ?? 'the client'}'s profile. The first saved edit sends the client back to pending approval.`}
        inputType="textarea"
        inputLabel="Note (optional)"
        confirmLabel="Grant"
      />
      <ConfirmationModal
        isOpen={!!refuseTarget}
        onClose={() => setRefuseTarget(null)}
        onConfirm={(note) => refuseTarget && void review(refuseTarget, false, note)}
        title="Refuse edit request"
        description={`${refuseTarget?.clientName ?? 'The client'}'s profile stays locked. Tell ${refuseTarget?.requestedByName ?? 'the requester'} why.`}
        inputType="textarea"
        inputLabel="Why is it refused?"
        requireInput
        confirmLabel="Refuse"
        confirmVariant="danger"
      />
    </div>
  );
}
