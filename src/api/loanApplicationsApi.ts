import apiClient from './apiClient';
import type { PagedResult } from './types';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Declined';

export interface LoanApplicationListItem {
  id: number;
  clientType: string;
  clientId: number | null;
  groupId: number | null;
  officeId: number | null;
  loanProductId: number;
  amount: number;
  status: ApprovalStatus;
  loanId: number | null;
}

export interface LoanApplicationFilters {
  status?: ApprovalStatus;
  officeId?: number;
  loanProductId?: number;
  page?: number;
  pageSize?: number;
}

export const loanApplicationsApi = {
  async list(filters: LoanApplicationFilters): Promise<PagedResult<LoanApplicationListItem>> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.officeId) params.set('officeId', String(filters.officeId));
    if (filters.loanProductId) params.set('loanProductId', String(filters.loanProductId));
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 15));

    const response = await apiClient.get<PagedResult<LoanApplicationListItem>>(`/loan-applications?${params.toString()}`);
    return response.data;
  },
};
