import apiClient from './apiClient';

export type FrequencyType = 'Days' | 'Weeks' | 'Months' | 'Years';
export type InterestRateFrequencyType = 'Day' | 'Week' | 'Month' | 'Year';
export type LoanInterestMethod = 'Flat' | 'DecliningBalance';
export type LoanAmortizationMethod = 'EqualInstallment' | 'EqualPrincipal';
export type InterestCalculationPeriodType = 'Daily' | 'Same';
export type YearDaysType = 'Actual' | 'Days360' | 'Days364' | 'Days365';
export type MonthDaysType = 'Actual' | 'Days30' | 'Days31';
export type LoanTransactionStrategy = 'PenaltyFeesInterestPrincipal' | 'PrincipalInterestPenaltyFees' | 'InterestPrincipalPenaltyFees';
export type LoanAccountingRule = 'None' | 'Cash' | 'AccrualPeriodic' | 'AccrualUpfront';

/** Everything the API saves for a product. Fields this portal doesn't edit (e.g. GL accounts) are sent back unchanged. */
export interface LoanProductFields {
  name: string | null;
  shortName: string | null;
  description: string | null;
  fundId: number | null;
  currencyId: number | null;
  decimals: number;
  minimumPrincipal: number | null;
  defaultPrincipal: number | null;
  maximumPrincipal: number | null;
  minimumLoanTerm: number | null;
  defaultLoanTerm: number | null;
  maximumLoanTerm: number | null;
  repaymentFrequency: number | null;
  repaymentFrequencyType: FrequencyType | null;
  minimumInterestRate: number | null;
  defaultInterestRate: number | null;
  maximumInterestRate: number | null;
  interestRateType: InterestRateFrequencyType | null;
  graceOnInterestCharged: number | null;
  graceOnPrincipal: number | null;
  graceOnInterestPayment: number | null;
  allowCustomGrace: boolean;
  allowStandingInstructions: boolean;
  interestMethod: LoanInterestMethod | null;
  amortizationMethod: LoanAmortizationMethod | null;
  interestCalculationPeriodType: InterestCalculationPeriodType;
  yearDays: YearDaysType;
  monthDays: MonthDaysType;
  loanTransactionStrategy: LoanTransactionStrategy;
  includeInCycle: boolean;
  lockGuarantee: boolean;
  allocateOverpayments: boolean;
  allowAdditionalCharges: boolean;
  accountingRule: LoanAccountingRule;
  npaDays: number | null;
  arrearsGraceDays: number | null;
  npaSuspendIncome: boolean;
  glAccountFundSourceId: number | null;
  glAccountLoanPortfolioId: number | null;
  glAccountReceivableInterestId: number | null;
  glAccountReceivableFeeId: number | null;
  glAccountReceivablePenaltyId: number | null;
  glAccountLoanOverPaymentsId: number | null;
  glAccountSuspendedIncomeId: number | null;
  glAccountIncomeInterestId: number | null;
  glAccountIncomeFeeId: number | null;
  glAccountIncomePenaltyId: number | null;
  glAccountIncomeRecoveryId: number | null;
  glAccountLoansWrittenOffId: number | null;
}

export interface LoanProduct extends LoanProductFields {
  id: number;
  active: boolean;
}

export const NEW_LOAN_PRODUCT: LoanProductFields = {
  name: '',
  shortName: null,
  description: null,
  fundId: null,
  currencyId: null,
  decimals: 2,
  minimumPrincipal: null,
  defaultPrincipal: null,
  maximumPrincipal: null,
  minimumLoanTerm: null,
  defaultLoanTerm: null,
  maximumLoanTerm: null,
  repaymentFrequency: 1,
  repaymentFrequencyType: 'Months',
  minimumInterestRate: null,
  defaultInterestRate: null,
  maximumInterestRate: null,
  interestRateType: 'Month',
  graceOnInterestCharged: null,
  graceOnPrincipal: null,
  graceOnInterestPayment: null,
  allowCustomGrace: false,
  allowStandingInstructions: false,
  interestMethod: 'Flat',
  amortizationMethod: 'EqualInstallment',
  interestCalculationPeriodType: 'Same',
  yearDays: 'Days365',
  monthDays: 'Days30',
  loanTransactionStrategy: 'PenaltyFeesInterestPrincipal',
  includeInCycle: false,
  lockGuarantee: false,
  allocateOverpayments: false,
  allowAdditionalCharges: false,
  accountingRule: 'Cash',
  npaDays: 90,
  arrearsGraceDays: 0,
  npaSuspendIncome: true,
  glAccountFundSourceId: null,
  glAccountLoanPortfolioId: null,
  glAccountReceivableInterestId: null,
  glAccountReceivableFeeId: null,
  glAccountReceivablePenaltyId: null,
  glAccountLoanOverPaymentsId: null,
  glAccountSuspendedIncomeId: null,
  glAccountIncomeInterestId: null,
  glAccountIncomeFeeId: null,
  glAccountIncomePenaltyId: null,
  glAccountIncomeRecoveryId: null,
  glAccountLoansWrittenOffId: null,
};

/** Just the saveable fields — drops id/active from a product read back from the API. */
export function toFields(product: LoanProductFields): LoanProductFields {
  const fields = { ...NEW_LOAN_PRODUCT };
  for (const key of Object.keys(NEW_LOAN_PRODUCT) as (keyof LoanProductFields)[]) {
    (fields as Record<string, unknown>)[key] = product[key];
  }
  return fields;
}

export const loanProductsApi = {
  async list(): Promise<LoanProduct[]> {
    const response = await apiClient.get<LoanProduct[]>('/loan-products');
    return response.data;
  },

  async create(fields: LoanProductFields): Promise<LoanProduct> {
    const response = await apiClient.post<LoanProduct>('/loan-products', fields);
    return response.data;
  },

  async update(id: number, fields: LoanProductFields): Promise<LoanProduct> {
    const response = await apiClient.put<LoanProduct>(`/loan-products/${id}`, fields);
    return response.data;
  },

  async activate(id: number): Promise<LoanProduct> {
    const response = await apiClient.post<LoanProduct>(`/loan-products/${id}/activate`);
    return response.data;
  },

  async deactivate(id: number): Promise<LoanProduct> {
    const response = await apiClient.post<LoanProduct>(`/loan-products/${id}/deactivate`);
    return response.data;
  },

  /** Ids of the fees and penalties attached to the product. */
  async charges(id: number): Promise<number[]> {
    const response = await apiClient.get<number[]>(`/loan-products/${id}/charges`);
    return response.data;
  },

  async setCharges(id: number, chargeIds: number[]): Promise<number[]> {
    const response = await apiClient.put<number[]>(`/loan-products/${id}/charges`, { chargeIds });
    return response.data;
  },
};
