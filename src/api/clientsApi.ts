import apiClient from './apiClient';
import type { PagedResult } from './types';

export type ClientStatus = 'Pending' | 'Active' | 'Inactive' | 'Declined' | 'Closed';

export interface ClientListItem {
  id: number;
  accountNo: string | null;
  displayName: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  mobile: string | null;
  bvn: string | null;
  officeId: number | null;
  staffId: number | null;
  status: ClientStatus;
  clientType: string | null;
  joinedDate: string | null;
  /** Kept on details that differ from their BVN at onboarding; can't be approved until a super admin marks them safe. */
  isHighRisk: boolean;
  /** The group the client is currently in, if any. */
  groupId: number | null;
  groupName: string | null;
}

/** The parts of a client's full record the high-risk review needs. */
export interface ClientRiskDetail {
  id: number;
  displayName: string | null;
  bvn: string | null;
  officeName: string | null;
  createdByName: string | null;
  highRiskReason: string | null;
  highRiskFlaggedAt: string | null;
  bvnVerifiedAt: string | null;
}

export interface ClientListFilters {
  search?: string;
  officeId?: number;
  status?: ClientStatus;
  /** The staff member the client is assigned to. */
  staffId?: number;
  highRisk?: boolean;
  page?: number;
  pageSize?: number;
}

/** What the signed-in user may do with a client, as the API decides it. */
export interface ClientActions {
  canEditDetails: boolean;
  canApprove: boolean;
  canDecline: boolean;
  canDelete: boolean;
  canRequestDeletion: boolean;
  canMarkSafe: boolean;
  canRequestEdit: boolean;
  /** Edit privilege was granted and the client hasn't been approved again yet. */
  editPrivilegeOpen: boolean;
  /** An edit request is waiting and the viewer may grant or refuse it. */
  canReviewEditRequests: boolean;
}

/** A request, raised in the office portal, to edit an approved client. */
export interface ClientEditRequest {
  id: number;
  clientId: number;
  clientName: string | null;
  clientAccountNo: string | null;
  officeName: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedById: number | null;
  requestedByName: string | null;
  createdAt: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  firstEditedAt: string | null;
  completedAt: string | null;
}

/** A client's full record, as the client page shows it. */
export interface ClientDetail {
  id: number;
  accountNo: string | null;
  displayName: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  status: ClientStatus;
  clientType: string | null;
  bvn: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  maritalStatus: string | null;
  dob: string | null;
  occupation: string | null;
  officeId: number | null;
  officeName: string | null;
  joinedDate: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  activatedDate: string | null;
  inactiveReason: string | null;
  declinedReason: string | null;
  closedReason: string | null;
  createdByName: string | null;
  activatedByName: string | null;
  bvnVerifiedAt: string | null;
  bvnDetailsSource: 'bvn' | 'client' | null;
  isHighRisk: boolean;
  highRiskReason: string | null;
  highRiskClearedAt: string | null;
  highRiskClearedNote: string | null;
  hasPhoto: boolean;
  actions: ClientActions | null;
  pendingDeletionRequest: boolean | null;
  /** What's still needed before the client can be approved, e.g. "1 more guarantor". */
  approvalBlockers: string[] | null;
  /** The edit request waiting for review, or the granted one still open. */
  currentEditRequest: ClientEditRequest | null;
  /** The client's loan or application still open, e.g. "Loan LN123 is still running." — null when none. */
  activeLoan: string | null;
}

export type GroupStatus = 'Pending' | 'Active' | 'Inactive' | 'Declined' | 'Closed';

export interface ClientGroupMembership {
  groupId: number;
  groupName: string | null;
  accountNo: string | null;
  status: GroupStatus;
  role: string | null;
  joinedAt: string | null;
}

export interface ClientAuditEntry {
  id: number | null;
  at: string | null;
  action: string | null;
  module: string | null;
  notes: string | null;
  userId: number | null;
  userName: string | null;
}

export interface ClientLoan {
  id: number;
  accountNumber: string | null;
  appliedAmount: number | null;
  approvedAmount: number | null;
  status: string;
}

/** One face capture: an enrollment (the client's face on record) or a loan face match. */
export interface FaceCapture {
  id: number;
  purpose: 'enrollment' | 'loan';
  loanId: number | null;
  status: 'pending' | 'passed' | 'failed';
  livenessConfidence: number | null;
  similarity: number | null;
  failureReason: string | null;
  capturedByName: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

export interface ClientBiometrics {
  enrolled: boolean;
  enrollment: FaceCapture | null;
  faceMatchThreshold: number;
  captures: FaceCapture[];
}

/** A live face capture (AWS Face Liveness), run from the browser against a session the API creates. */
export const biometricsApi = {
  async start(clientId: number, purpose: 'enrollment' | 'loan', loanId: number | null): Promise<{ captureId: number; sessionId: string; region: string }> {
    return (await apiClient.post(`/clients/${clientId}/biometrics/sessions`, { purpose, loanId })).data;
  },

  async complete(clientId: number, sessionId: string): Promise<FaceCapture> {
    return (await apiClient.post<FaceCapture>(`/clients/${clientId}/biometrics/sessions/${encodeURIComponent(sessionId)}/complete`)).data;
  },

  /** Short-lived AWS credentials the camera component streams with — they allow nothing but the liveness check. */
  async credentials(): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string; expiration: string }> {
    return (await apiClient.post('/biometrics/credentials')).data;
  },
};

export const GROUP_ROLE_LABELS: Record<string, string> = {
  leader: 'Leader',
  assistant: 'Assistant',
  organizer: 'Organizer',
  member: 'Member',
};

export const editRequestsApi = {
  /** Newest first; "pending" shows what's waiting, "all" everything. */
  async list(status: ClientEditRequest['status'] | 'all', page: number, pageSize: number): Promise<PagedResult<ClientEditRequest>> {
    return (await apiClient.get<PagedResult<ClientEditRequest>>('/client-edit-requests', { params: { status, page, pageSize } })).data;
  },

  async approve(id: number, note: string | null): Promise<ClientEditRequest> {
    return (await apiClient.post<ClientEditRequest>(`/client-edit-requests/${id}/approve`, { note })).data;
  },

  /** The note tells the requester why. */
  async reject(id: number, note: string): Promise<ClientEditRequest> {
    return (await apiClient.post<ClientEditRequest>(`/client-edit-requests/${id}/reject`, { note })).data;
  },
};

export const clientsApi = {
  async list(filters: ClientListFilters): Promise<PagedResult<ClientListItem>> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.officeId) params.set('officeId', String(filters.officeId));
    if (filters.status) params.set('status', filters.status);
    if (filters.staffId) params.set('staffId', String(filters.staffId));
    if (filters.highRisk !== undefined) params.set('highRisk', String(filters.highRisk));
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 15));

    const response = await apiClient.get<PagedResult<ClientListItem>>(`/clients?${params.toString()}`);
    return response.data;
  },

  async get(id: number): Promise<ClientRiskDetail> {
    const response = await apiClient.get<ClientRiskDetail>(`/clients/${id}`);
    return response.data;
  },

  async detail(id: number): Promise<ClientDetail> {
    return (await apiClient.get<ClientDetail>(`/clients/${id}`)).data;
  },

  async groups(id: number): Promise<ClientGroupMembership[]> {
    return (await apiClient.get<ClientGroupMembership[]>(`/clients/${id}/groups`)).data;
  },

  async audit(id: number): Promise<ClientAuditEntry[]> {
    return (await apiClient.get<ClientAuditEntry[]>(`/clients/${id}/audit`)).data;
  },

  async loans(id: number): Promise<PagedResult<ClientLoan>> {
    return (await apiClient.get<PagedResult<ClientLoan>>('/loans', { params: { clientId: id, page: 1, pageSize: 100 } })).data;
  },

  async biometrics(id: number): Promise<ClientBiometrics> {
    return (await apiClient.get<ClientBiometrics>(`/clients/${id}/biometrics`)).data;
  },

  /** The profile picture as an object URL — the endpoint needs the auth header, so an <img src> can't load it directly. Null when there's none. */
  async photoUrl(id: number): Promise<string | null> {
    try {
      const response = await apiClient.get<Blob>(`/clients/${id}/photo`, { responseType: 'blob' });
      return URL.createObjectURL(response.data);
    } catch {
      return null;
    }
  },

  async approve(id: number): Promise<void> {
    await apiClient.post(`/clients/${id}/activate`, { activatedDate: null });
  },

  async decline(id: number, reason: string): Promise<void> {
    await apiClient.post(`/clients/${id}/decline`, { reason });
  },

  async deactivate(id: number, reason: string): Promise<void> {
    await apiClient.post(`/clients/${id}/deactivate`, { reason });
  },

  async reactivate(id: number): Promise<void> {
    await apiClient.post(`/clients/${id}/reactivate`);
  },

  /** Closing is final. */
  async close(id: number, reason: string): Promise<void> {
    await apiClient.post(`/clients/${id}/close`, { reason });
  },

  /** Only for a client who has never been approved; approved clients go through a deletion request. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/clients/${id}`);
  },

  /** Clears a client's high-risk flag so a controller can approve them. */
  async markSafe(id: number, note: string | null): Promise<void> {
    await apiClient.post(`/clients/${id}/mark-safe`, { note });
  },
};
