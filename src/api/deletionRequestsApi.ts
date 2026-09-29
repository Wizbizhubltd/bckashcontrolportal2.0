import apiClient from './apiClient';
import type { PagedResult } from './types';

export type DeletionRequestStatus = 'Pending' | 'Approved' | 'Rejected';

/** A request, raised in the office portal, to delete an approved client or a group with an approved member. */
export interface DeletionRequest {
  id: number;
  entityType: 'client' | 'group';
  entityId: number;
  entityName: string | null;
  officeId: number | null;
  officeName: string | null;
  reason: string;
  status: DeletionRequestStatus;
  requestedById: number | null;
  requestedByName: string | null;
  createdAt: string | null;
  reviewedById: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

/** Super admins only. */
export const deletionRequestsApi = {
  async list(status: DeletionRequestStatus | null, page: number, pageSize: number): Promise<PagedResult<DeletionRequest>> {
    const response = await apiClient.get<PagedResult<DeletionRequest>>('/deletion-requests', { params: { status: status ?? undefined, page, pageSize } });
    return response.data;
  },

  /** The pending request to delete this client or group, if there is one. */
  async pendingFor(entityType: 'client' | 'group', entityId: number): Promise<DeletionRequest | null> {
    const response = await apiClient.get<PagedResult<DeletionRequest>>('/deletion-requests', { params: { status: 'Pending', entityType, entityId, page: 1, pageSize: 1 } });
    return response.data.items[0] ?? null;
  },

  /** Approving deletes the client or group. */
  async approve(id: number, note: string | null): Promise<DeletionRequest> {
    const response = await apiClient.post<DeletionRequest>(`/deletion-requests/${id}/approve`, { note });
    return response.data;
  },

  async reject(id: number, note: string): Promise<DeletionRequest> {
    const response = await apiClient.post<DeletionRequest>(`/deletion-requests/${id}/reject`, { note });
    return response.data;
  },
};
