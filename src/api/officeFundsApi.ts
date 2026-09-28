import apiClient from './apiClient';

export type OfficeFundingStatus = 'PendingAcknowledgement' | 'Acknowledged' | 'Disputed' | 'Cancelled';
export type OfficeFundEntryType = 'Funding' | 'LoanDisbursement';
export type OfficeFundEventType =
  | 'FundingSent'
  | 'FundingAcknowledged'
  | 'FundingDisputed'
  | 'FundingCancelled'
  | 'BankAccountAdded'
  | 'DefaultAccountChanged'
  | 'BankAccountDeactivated'
  | 'ManagerAssigned';

export interface OfficeBankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
  active: boolean;
  createdAt: string | null;
}

export interface OfficeFunding {
  id: number;
  officeId: number;
  officeName: string | null;
  amount: number;
  reference: string;
  fundedOn: string;
  bankAccountLabel: string | null;
  notes: string | null;
  status: OfficeFundingStatus;
  fundedByName: string | null;
  createdAt: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  disputedByName: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  disputeDocumentName: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface OfficeFundEntry {
  id: number;
  type: OfficeFundEntryType;
  amount: number;
  balanceAfter: number;
  fundingId: number | null;
  loanId: number | null;
  description: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface OfficeFundEvent {
  id: number;
  type: OfficeFundEventType;
  fundingId: number | null;
  amount: number | null;
  comment: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface OfficeBusinessOperations {
  officeId: number;
  /** Acknowledged funding less loans disbursed. */
  balance: number;
  /** Loans approved but not yet disbursed. */
  committed: number;
  /** What new loans can still be approved against. */
  available: number;
  pendingAmount: number;
  pendingCount: number;
  managerId: number | null;
  managerName: string | null;
  /** Settings → Loan → "Loans draw on office funds". */
  loansRequireFunds: boolean;
  canAcknowledge: boolean;
  bankAccounts: OfficeBankAccount[];
  fundings: OfficeFunding[];
  entries: OfficeFundEntry[];
  activity: OfficeFundEvent[];
}

/** A Nigerian bank an office account can be held with, and its CBN licence type. */
export interface Bank {
  name: string;
  category: string;
}

export const officeFundsApi = {
  async banks(): Promise<Bank[]> {
    const response = await apiClient.get<Bank[]>('/banks');
    return response.data;
  },

  async get(officeId: number): Promise<OfficeBusinessOperations> {
    const response = await apiClient.get<OfficeBusinessOperations>(`/offices/${officeId}/business-operations`);
    return response.data;
  },

  async addBankAccount(officeId: number, input: { bankName: string; accountName: string; accountNumber: string; makeDefault: boolean }): Promise<OfficeBankAccount> {
    const response = await apiClient.post<OfficeBankAccount>(`/offices/${officeId}/bank-accounts`, input);
    return response.data;
  },

  async setDefault(officeId: number, accountId: number): Promise<OfficeBankAccount> {
    const response = await apiClient.post<OfficeBankAccount>(`/offices/${officeId}/bank-accounts/${accountId}/default`);
    return response.data;
  },

  async deactivateAccount(officeId: number, accountId: number): Promise<OfficeBankAccount> {
    const response = await apiClient.post<OfficeBankAccount>(`/offices/${officeId}/bank-accounts/${accountId}/deactivate`);
    return response.data;
  },

  async fund(officeId: number, input: { amount: number; reference: string; fundedOn: string | null; notes: string | null }): Promise<OfficeFunding> {
    const response = await apiClient.post<OfficeFunding>(`/offices/${officeId}/fundings`, input);
    return response.data;
  },

  async cancel(fundingId: number, comment: string): Promise<OfficeFunding> {
    const response = await apiClient.post<OfficeFunding>(`/office-fundings/${fundingId}/cancel`, { comment });
    return response.data;
  },

  /** Opens the bank statement attached to a dispute in a new tab. */
  async openStatement(fundingId: number): Promise<void> {
    const response = await apiClient.get<Blob>(`/office-fundings/${fundingId}/statement`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
