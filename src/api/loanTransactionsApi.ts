import apiClient from './apiClient';
import type { PagedResult } from './types';

export type LoanTransactionType = 'Disbursement' | 'Repayment';

export interface LoanTransactionItem {
  id: number;
  loanId: number | null;
  transactionType: string | null;
  amount: number | null;
  principal: number | null;
  interest: number | null;
  fee: number | null;
  penalty: number | null;
  overpayment: number | null;
  date: string | null;
  reversible: boolean;
  reversed: boolean;
  notes: string | null;
}

export interface LoanTransactionFilters {
  transactionType?: LoanTransactionType;
  officeId?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const loanTransactionsApi = {
  async list(filters: LoanTransactionFilters): Promise<PagedResult<LoanTransactionItem>> {
    const params = new URLSearchParams();
    if (filters.transactionType) params.set('transactionType', filters.transactionType);
    if (filters.officeId) params.set('officeId', String(filters.officeId));
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 15));

    const response = await apiClient.get<PagedResult<LoanTransactionItem>>(`/loan-transactions?${params.toString()}`);
    return response.data;
  },
};
