import apiClient from './apiClient';

export interface LoanProduct {
  id: number;
  name: string | null;
}

export const loanProductsApi = {
  async list(): Promise<LoanProduct[]> {
    const response = await apiClient.get<LoanProduct[]>('/loan-products');
    return response.data;
  },
};
