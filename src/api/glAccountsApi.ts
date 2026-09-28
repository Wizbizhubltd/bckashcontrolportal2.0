import apiClient from './apiClient';

export type GlAccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface GlAccount {
  id: number;
  name: string | null;
  glCode: string | null;
  accountType: GlAccountType;
  active: boolean;
}

export const glAccountsApi = {
  async list(): Promise<GlAccount[]> {
    const response = await apiClient.get<GlAccount[]>('/gl-accounts');
    return response.data;
  },
};
