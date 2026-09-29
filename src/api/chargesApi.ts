import apiClient from './apiClient';

export type ChargeProduct = 'Loan' | 'Savings' | 'Shares' | 'Client' | 'Group';

export type ChargeType =
  | 'Disbursement'
  | 'DisbursementRepayment'
  | 'SpecifiedDueDate'
  | 'InstallmentFee'
  | 'OverdueInstallmentFee'
  | 'LoanReschedulingFee'
  | 'OverdueMaturity'
  | 'EarlyRepayment'
  | 'ApplicationFormFee'
  | 'SavingsActivation'
  | 'WithdrawalFee'
  | 'AnnualFee'
  | 'MonthlyFee'
  | 'Activation'
  | 'SharesPurchase'
  | 'SharesRedeem';

export type ChargeOption =
  | 'Flat'
  | 'Percentage'
  | 'InstallmentPrincipalDue'
  | 'InstallmentPrincipalInterestDue'
  | 'InstallmentInterestDue'
  | 'InstallmentTotalDue'
  | 'TotalDue'
  | 'PrincipalDue'
  | 'InterestDue'
  | 'TotalOutstanding'
  | 'OriginalPrincipal';

export interface Charge {
  id: number;
  name: string | null;
  product: ChargeProduct;
  chargeType: ChargeType;
  chargeOption: ChargeOption;
  amount: number | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  active: boolean;
  /** Set by the server from the type — late repayment, default and early closure charges are penalties. */
  penalty: boolean;
  glAccountIncomeId: number | null;
  graceDays: number | null;
  repeatEveryDays: number | null;
  maxTotalPercent: number | null;
  freeAfterInstallments: number | null;
  /** Loans, loan products, savings accounts and savings products it's attached to. */
  usageCount: number;
}

export interface SaveChargeInput {
  name: string;
  product: ChargeProduct;
  chargeType: ChargeType;
  chargeOption: ChargeOption;
  amount: number;
  minimumAmount: number | null;
  maximumAmount: number | null;
  glAccountIncomeId: number | null;
  graceDays: number | null;
  repeatEveryDays: number | null;
  maxTotalPercent: number | null;
  freeAfterInstallments: number | null;
}

// Legacy fields the API still requires but this portal doesn't use — repetition is expressed by
// the charge type and the penalty controls instead.
const LEGACY_DEFAULTS = {
  currencyId: null,
  chargeFrequency: 0,
  chargeFrequencyType: 'Days',
  chargeFrequencyAmount: 0,
  chargePaymentMode: 'Regular',
  penalty: false,
  override: false,
};

export const chargesApi = {
  async list(): Promise<Charge[]> {
    const response = await apiClient.get<Charge[]>('/charges');
    return response.data;
  },

  async create(input: SaveChargeInput): Promise<Charge> {
    const response = await apiClient.post<Charge>('/charges', { ...LEGACY_DEFAULTS, ...input });
    return response.data;
  },

  async update(id: number, input: SaveChargeInput): Promise<Charge> {
    const response = await apiClient.put<Charge>(`/charges/${id}`, { ...LEGACY_DEFAULTS, ...input });
    return response.data;
  },

  /** Deactivates — charges already attached to loans keep working. */
  async deactivate(id: number): Promise<void> {
    await apiClient.delete(`/charges/${id}`);
  },

  async activate(id: number): Promise<Charge> {
    const response = await apiClient.post<Charge>(`/charges/${id}/activate`);
    return response.data;
  },
};
