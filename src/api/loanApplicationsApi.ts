import apiClient from './apiClient';
import type { PagedResult } from './types';
import type { DisbursementMode } from '../utils/disbursement';

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

/** An application's full record, as the application page shows it. */
export interface LoanApplicationDetail {
  id: number;
  clientType: 'Client' | 'Group';
  /** The loan created when the application was approved. */
  loanId: number | null;
  officeId: number | null;
  clientId: number | null;
  groupId: number | null;
  loanProductId: number;
  amount: number;
  status: ApprovalStatus;
  loanTerm: number | null;
  loanTermType: string | null;
  approvedNotes: string | null;
  declinedNotes: string | null;
  notes: string | null;
  applicantName: string | null;
  loanProductName: string | null;
  officeName: string | null;
  disbursementMode: DisbursementMode | null;
  disbursementBankName: string | null;
  disbursementAccountNumber: string | null;
  disbursementAccountName: string | null;
}

export interface ApplicationGuarantor {
  id: number;
  isClient: boolean;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  amount: number | null;
}

export interface ApplicationCollateral {
  id: number;
  name: string | null;
  serial: string | null;
  value: number | null;
  description: string | null;
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

  async get(id: number): Promise<LoanApplicationDetail> {
    return (await apiClient.get<LoanApplicationDetail>(`/loan-applications/${id}`)).data;
  },

  /** Creates the loan (pending disbursement). Refused when the office hasn't the funds. */
  async approve(id: number, approvedAmount: number, notes: string | null): Promise<LoanApplicationDetail> {
    return (await apiClient.post<LoanApplicationDetail>(`/loan-applications/${id}/approve`, { approvedAmount, notes })).data;
  },

  /** Final — a declined application can't be reopened. */
  async decline(id: number, reason: string): Promise<LoanApplicationDetail> {
    return (await apiClient.post<LoanApplicationDetail>(`/loan-applications/${id}/decline`, { reason })).data;
  },

  async guarantors(id: number): Promise<ApplicationGuarantor[]> {
    return (await apiClient.get<ApplicationGuarantor[]>(`/loan-applications/${id}/guarantors`)).data;
  },

  async collateral(id: number): Promise<ApplicationCollateral[]> {
    return (await apiClient.get<ApplicationCollateral[]>(`/loan-applications/${id}/collateral`)).data;
  },
};
