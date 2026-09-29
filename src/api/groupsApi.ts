import apiClient from './apiClient';
import type { BulkActionResult, PagedResult } from './types';
import type { ClientStatus } from './clientsApi';

export type GroupStatus = 'Pending' | 'Active' | 'Inactive' | 'Declined' | 'Closed';

export interface GroupListItem {
  id: number;
  accountNo: string | null;
  name: string | null;
  officeId: number | null;
  /** The marketer the group is assigned to. */
  staffId: number | null;
  staffName: string | null;
  status: GroupStatus;
  joinedDate: string | null;
  /** Clients currently in the group. */
  memberCount: number;
}

/** A group's own record. */
export interface GroupProfile {
  id: number;
  accountNo: string | null;
  name: string | null;
  officeId: number | null;
  staffId: number | null;
  status: GroupStatus;
  joinedDate: string | null;
  activatedDate: string | null;
  inactiveReason: string | null;
  closedReason: string | null;
  declinedReason: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface GroupSummaryMember {
  clientId: number;
  displayName: string | null;
  accountNo: string | null;
  status: ClientStatus;
  isHighRisk: boolean;
  role: string | null;
  loanAmount: number;
  pendingRepayment: number;
}

/** A loan or loan application on the group page: a member's own, their share of a group loan, or the group's. */
export interface GroupLoanRecord {
  kind: 'loan' | 'application';
  id: number;
  clientId: number | null;
  clientName: string | null;
  reference: string | null;
  loanProductName: string | null;
  amount: number;
  status: string;
  date: string | null;
}

/** Loan totals and the roster for the group page. */
export interface GroupSummary {
  cumulativeLoanAmount: number;
  cumulativeLoanCount: number;
  pendingRepaymentAmount: number;
  totalMembers: number;
  approvedMembers: number;
  pendingMembers: number;
  members: GroupSummaryMember[];
  canDelete: boolean;
  pendingDeletionRequest: boolean;
  createdByName: string | null;
  officeName: string | null;
  loanRecords: GroupLoanRecord[];
}

export interface GroupListFilters {
  search?: string;
  officeId?: number;
  status?: GroupStatus;
  page?: number;
  pageSize?: number;
}

export const groupsApi = {
  async list(filters: GroupListFilters): Promise<PagedResult<GroupListItem>> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.officeId) params.set('officeId', String(filters.officeId));
    if (filters.status) params.set('status', filters.status);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 15));

    const response = await apiClient.get<PagedResult<GroupListItem>>(`/groups?${params.toString()}`);
    return response.data;
  },

  async get(id: number): Promise<GroupProfile> {
    return (await apiClient.get<GroupProfile>(`/groups/${id}`)).data;
  },

  async summary(id: number): Promise<GroupSummary> {
    return (await apiClient.get<GroupSummary>(`/groups/${id}/summary`)).data;
  },

  async disable(id: number, reason: string): Promise<void> {
    await apiClient.post(`/groups/${id}/deactivate`, { reason });
  },

  async enable(id: number): Promise<void> {
    await apiClient.post(`/groups/${id}/reactivate`);
  },

  /** Closing is final. */
  async close(id: number, reason: string): Promise<void> {
    await apiClient.post(`/groups/${id}/close`, { reason });
  },

  /** Only for a group none of whose members has been approved; its clients stay on the platform. */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/groups/${id}`);
  },

  /** Bulk action: hands the groups, and every client in them, to a marketer in each group's office. */
  async bulkReassignMarketer(groupIds: number[], marketerId: number): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>('/groups/bulk/reassign-marketer', { groupIds, marketerId });
    return response.data;
  },

  /** Bulk action: disables the active groups, recording the reason on each. */
  async bulkDisable(groupIds: number[], reason: string): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>('/groups/bulk/deactivate', { groupIds, reason });
    return response.data;
  },

  /** Bulk action: re-enables disabled groups. */
  async bulkEnable(groupIds: number[]): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>('/groups/bulk/reactivate', { groupIds });
    return response.data;
  },

  /** Bulk action: moves clients out of their current group into this one. Clients with active loans and defaulters stay put. */
  async bulkMoveClients(groupId: number, clientIds: number[]): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>(`/groups/${groupId}/members/bulk-move`, { clientIds });
    return response.data;
  },
};
