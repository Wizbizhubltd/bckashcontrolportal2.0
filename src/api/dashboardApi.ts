import apiClient from './apiClient';

export interface DashboardSummary {
  officesCount: number;
  activeOfficesCount: number;
  staffCount: number;
  clientsCount: number;
  activeClientsCount: number;
  outstandingLoansCount: number;
  lateLoansCount: number;
  disbursementsThisMonthCount: number;
  disbursementsThisMonthAmount: number;
  repaymentsThisMonthCount: number;
  repaymentsThisMonthAmount: number;
  pendingLoanApplicationsCount: number;
  pendingStaffOnboardingCount: number;
  loanPortfolio: LoanPortfolioSummary;
}

/** All-time amounts (NGN) by loan stage, each with the number of loans behind it (repaid counts transactions). */
export interface LoanPortfolioSummary {
  requestedAmount: number;
  requestedCount: number;
  approvedAmount: number;
  approvedCount: number;
  rejectedAmount: number;
  rejectedCount: number;
  pendingApprovalAmount: number;
  pendingApprovalCount: number;
  repaidAmount: number;
  repaidCount: number;
  /** Overdue principal + interest on loans that missed a repayment date but aren't past their final one. */
  lateRepaymentAmount: number;
  lateRepaymentCount: number;
  /** Outstanding principal + interest on disbursed loans past their final repayment date. */
  defaultedAmount: number;
  defaultedCount: number;
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },
};
