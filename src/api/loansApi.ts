import apiClient from './apiClient';
import type { PagedResult } from './types';
import type { DisbursementMode } from '../utils/disbursement';

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

/** A loan's full record, as the loan page shows it. */
export interface LoanDetail {
  id: number;
  applicantName: string | null;
  loanProductName: string | null;
  officeName: string | null;
  clientType: 'Client' | 'Group';
  clientId: number | null;
  groupId: number | null;
  officeId: number | null;
  accountNumber: string | null;
  principal: number | null;
  appliedAmount: number | null;
  approvedAmount: number | null;
  loanTerm: number | null;
  loanTermType: string | null;
  interestRate: number | null;
  status: LoanStatus;
  approvedNotes: string | null;
  disbursementDate: string | null;
  disbursedNotes: string | null;
  writtenOffDate: string | null;
  writtenOffNotes: string | null;
  isNpa: boolean;
  incomeSuspended: boolean;
  notes: string | null;
  disbursementMode: DisbursementMode | null;
  disbursementBankName: string | null;
  disbursementAccountNumber: string | null;
  disbursementAccountName: string | null;
}

export interface ScheduleInstallment {
  id: number;
  installment: number | null;
  dueDate: string | null;
  principal: number | null;
  principalPaid: number | null;
  interest: number | null;
  interestPaid: number | null;
  fees: number | null;
  feesPaid: number | null;
  penalty: number | null;
  penaltyPaid: number | null;
  totalDue: number | null;
  paid: boolean;
  /** What the client pays — more than totalDue on a savings loan, since a share goes to their savings. */
  customerPays: number | null;
}

export interface LoanTransaction {
  id: number;
  transactionType: string | null;
  amount: number | null;
  principal: number | null;
  interest: number | null;
  fee: number | null;
  penalty: number | null;
  date: string | null;
  reversed: boolean;
  notes: string | null;
}

export interface LoanCharge {
  id: number;
  penalty: boolean;
  chargeType: string;
  chargeOption: string;
  amount: number | null;
  dueDate: string | null;
  gracePeriod: number;
}

export interface RescheduleRequest {
  id: number;
  principal: number | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  rescheduleFromDate: string | null;
  notes: string | null;
}

/** Whether a client receiving the loan has passed the face match needed before disbursement. */
export interface LoanFaceCheck {
  clientId: number;
  clientName: string | null;
  enrolled: boolean;
  verified: boolean;
  similarity: number | null;
  /** Whether the viewer's role may run this face match (Settings → Loan). */
  canVerify: boolean;
}

export interface LoanListFilters {
  status?: LoanStatus;
  officeId?: number;
  /** The staff member responsible for the loan. */
  loanOfficerId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: LoanListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.officeId) params.set('officeId', String(filters.officeId));
  if (filters.loanOfficerId) params.set('loanOfficerId', String(filters.loanOfficerId));
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

  async get(id: number): Promise<LoanDetail> {
    return (await apiClient.get<LoanDetail>(`/loans/${id}`)).data;
  },

  async schedule(id: number): Promise<ScheduleInstallment[]> {
    return (await apiClient.get<ScheduleInstallment[]>(`/loans/${id}/schedule`)).data;
  },

  async repayments(id: number): Promise<LoanTransaction[]> {
    return (await apiClient.get<LoanTransaction[]>(`/loans/${id}/repayments`)).data;
  },

  async charges(id: number): Promise<LoanCharge[]> {
    return (await apiClient.get<LoanCharge[]>(`/loans/${id}/charges`)).data;
  },

  async rescheduleRequests(id: number): Promise<RescheduleRequest[]> {
    return (await apiClient.get<RescheduleRequest[]>(`/loans/${id}/reschedule-requests`)).data;
  },

  async faceChecks(id: number): Promise<LoanFaceCheck[]> {
    return (await apiClient.get<LoanFaceCheck[]>(`/loans/${id}/face-checks`)).data;
  },

  /** Pays out a pending loan and generates its schedule. The server refuses until every recipient has passed their face match. */
  async disburse(id: number, disbursedAmount: number, notes: string | null): Promise<void> {
    await apiClient.post(`/loans/${id}/disburse`, { disbursementDate: null, disbursedAmount, notes });
  },

  async late(filters: Omit<LoanListFilters, 'status'>): Promise<PagedResult<LoanListItem>> {
    const response = await apiClient.get<PagedResult<LoanListItem>>(`/loans/late?${buildQuery(filters)}`);
    return response.data;
  },
};
