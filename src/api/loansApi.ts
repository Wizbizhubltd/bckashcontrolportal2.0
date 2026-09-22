import apiClient from './apiClient';
import type { PagedResult } from './types';

export const LOAN_STATUSES = [
  'New', 'Pending', 'Approved', 'NeedChanges', 'Disbursed', 'Declined', 'Rejected',
  'Withdrawn', 'WrittenOff', 'Closed', 'PendingReschedule', 'Rescheduled', 'Paid',
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export interface LoanListItem {
  id: number;
  accountNumber: string | null;
  clientId: number | null;
  groupId: number | null;
  officeId: number | null;
  loanProductId: number | null;
  appliedAmount: number | null;
  approvedAmount: number | null;
  status: LoanStatus;
}

export interface LoanListFilters {
  status?: LoanStatus;
  officeId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: LoanListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.officeId) params.set('officeId', String(filters.officeId));
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 15));
  return params.toString();
}

export const loansApi = {
  async list(filters: LoanListFilters): Promise<PagedResult<LoanListItem>> {
    const response = await apiClient.get<PagedResult<LoanListItem>>(`/loans?${buildQuery(filters)}`);
    return response.data;
  },

  async late(filters: Omit<LoanListFilters, 'status'>): Promise<PagedResult<LoanListItem>> {
    const response = await apiClient.get<PagedResult<LoanListItem>>(`/loans/late?${buildQuery(filters)}`);
    return response.data;
  },
};
