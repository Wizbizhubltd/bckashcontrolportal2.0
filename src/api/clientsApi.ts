import apiClient from './apiClient';
import type { BulkActionResult, PagedResult } from './types';

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
  externalId: string | null;
  businessAddress: string | null;
  nationality: string | null;
  /** The account officer (the assigned marketer). */
  staffName: string | null;
  createdAt: string | null;
}

/** Everything the printed membership/loan form needs besides the client record. */
export interface ClientLoanForm {
  staffName: string | null;
  /** From the client's latest loan application, or their latest loan. */
  proposedLoanAmount: number | null;
  loanTerm: number | null;
  loanTermType: string | null;
  loanProductName: string | null;
  nin: string | null;
  /** The application form fee in force now; null when switched off. */
  formFee: number | null;
  groupId: number | null;
  groupName: string | null;
  groupMembers: { clientId: number; name: string | null; role: string | null }[];
}

/** A guarantor or reference. */
export interface ClientContact {
  id: number;
  kind: 'guarantor' | 'reference';
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  relationship: string | null;
  occupation: string | null;
  gender: string | null;
  hasPhoto: boolean;
  createdAt: string | null;
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
  /** Whether the signed-in user can capture the face now — for a super admin, only a client approved before face capture who was never enrolled. */
  canEnroll: boolean;
  /** Why the face can't be captured right now, when it can't. */
  enrollBlockedReason: string | null;
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

export interface BvnFieldComparison {
  field: string;
  given: string | null;
  fromBvn: string | null;
  matches: boolean;
}

export interface BvnCheck {
  verificationId: number;
  matches: boolean;
  comparisons: BvnFieldComparison[];
  fromBvn: {
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
    phone: string | null;
    birthDate: string | null;
    gender: string | null;
    /** Base64 JPEG from the BVN record, when the provider sends one. */
    photo: string | null;
  };
}

/** One client in an onboarding request; `detailsSource`/`overrideReason` only matter when the BVN didn't match. */
export interface OnboardClientInput {
  fullName: string;
  email: string | null;
  phone: string | null;
  bvn: string;
  bvnVerificationId: number;
  detailsSource: 'bvn' | 'client' | null;
  overrideReason: string | null;
}

export interface OnboardingResult {
  groupId: number | null;
  clients: { id: number; accountNo: string | null; displayName: string | null; isHighRisk: boolean }[];
}

/** Where a super admin's onboarded clients go: an office, and the marketer there who manages them. */
export interface OnboardingAssignment {
  officeId: number;
  marketerId: number;
}

/**
 * The API's field-level onboarding errors: keys are "group", "office", "marketer", "members", or
 * "members[i]" for the i-th client.
 */
export function onboardingErrors(error: unknown): Record<string, string> {
  const data = (error as { responseData?: { errors?: Record<string, string> } } | undefined)?.responseData;
  return data?.errors ?? {};
}

/** A client's whole editable record, as GET /clients/{id} returns it. */
export interface ClientRecord {
  id: number;
  bvn: string | null;
  countryId: number | null;
  officeId: number | null;
  staffId: number | null;
  referredById: number | null;
  externalId: string | null;
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  incorporationNumber: string | null;
  displayName: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  clientType: string | null;
  maritalStatus: string | null;
  dob: string | null;
  street: string | null;
  ward: string | null;
  district: string | null;
  region: string | null;
  address: string | null;
  joinedDate: string | null;
  occupation: string | null;
  postalCode: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  businessAddress: string | null;
  nationality: string | null;
}

/** The body of PUT /clients/{id}: every field is written, so send the ones you don't change as loaded. */
export type UpdateClientInput = Omit<ClientRecord, 'id'> & { fullName: string | null; picture: null };

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

/**
 * BVN checks wait on the provider (up to 30s, plus one retry after logging in again), so they get longer than the
 * usual timeout — when the provider fails, the API's "network error from the BVN API provider" message reaches staff
 * rather than a timeout of our own.
 */
const BVN_CHECK_TIMEOUT_MS = 90_000;

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

  async record(id: number): Promise<ClientRecord> {
    return (await apiClient.get<ClientRecord>(`/clients/${id}`)).data;
  },

  /** A super admin's edit goes straight through — no edit privilege, no return to pending — and is recorded in the audit trail. */
  async update(id: number, input: UpdateClientInput): Promise<void> {
    await apiClient.put(`/clients/${id}`, input);
  },

  /** Looks the BVN up with the verification provider; the result's `verificationId` goes back with the client when they're onboarded. */
  async checkBvn(bvn: string, fullName: string, phone: string | null): Promise<BvnCheck> {
    return (await apiClient.post<BvnCheck>('/onboarding/bvn-check', { bvn, fullName, phone }, { timeout: BVN_CHECK_TIMEOUT_MS })).data;
  },

  async onboardClient(assignment: OnboardingAssignment, client: OnboardClientInput): Promise<OnboardingResult> {
    return (await apiClient.post<OnboardingResult>('/onboarding/clients', { ...assignment, client })).data;
  },

  /** At least three members; the first three become the group's leader, assistant and organizer. */
  async onboardGroup(
    assignment: OnboardingAssignment,
    group: { name: string; phone: string | null; email: string | null; address: string | null },
    members: OnboardClientInput[],
  ): Promise<OnboardingResult> {
    return (await apiClient.post<OnboardingResult>('/onboarding/groups', { ...assignment, group, members })).data;
  },

  async groups(id: number): Promise<ClientGroupMembership[]> {
    return (await apiClient.get<ClientGroupMembership[]>(`/clients/${id}/groups`)).data;
  },

  async loanForm(id: number): Promise<ClientLoanForm> {
    return (await apiClient.get<ClientLoanForm>(`/clients/${id}/loan-form`)).data;
  },

  async contacts(id: number, kind: 'guarantors' | 'references'): Promise<ClientContact[]> {
    return (await apiClient.get<ClientContact[]>(`/clients/${id}/${kind}`)).data;
  },

  /** A guarantor's or reference's passport photo as an object URL (the endpoint needs the auth header); null when there's none. */
  async contactPhotoUrl(clientId: number, kind: 'guarantors' | 'references', contactId: number): Promise<string | null> {
    try {
      const response = await apiClient.get<Blob>(`/clients/${clientId}/${kind}/${contactId}/photo`, { responseType: 'blob' });
      return URL.createObjectURL(response.data);
    } catch {
      return null;
    }
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

  /**
   * Bulk action: moves the ticked clients to an office under a marketer there. They leave their group and take
   * their open savings accounts along; clients with an open loan or application, and defaulters, are skipped.
   */
  async bulkTransfer(clientIds: number[], officeId: number, marketerId: number): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>('/clients/bulk/transfer', { clientIds, officeId, marketerId });
    return response.data;
  },

  /** "Verify now" for a client onboarded before BVN checks: looks up the BVN on file (or `bvn`, when none is) against their details. */
  async checkExistingBvn(id: number, bvn: string | null): Promise<BvnCheck> {
    return (await apiClient.post<BvnCheck>(`/clients/${id}/bvn-check`, { bvn }, { timeout: BVN_CHECK_TIMEOUT_MS })).data;
  },

  /** Marks the client's BVN verified from that lookup; when it didn't match, `detailsSource` says whose details to keep. */
  async verifyExistingBvn(id: number, verificationId: number, detailsSource: 'bvn' | 'client' | null, overrideReason: string | null): Promise<void> {
    await apiClient.post(`/clients/${id}/bvn-verification`, { verificationId, detailsSource, overrideReason });
  },
};
