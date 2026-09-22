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
}

export const dashboardApi = {
  async getSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },
};
