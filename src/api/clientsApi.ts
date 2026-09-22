import apiClient from './apiClient';
import type { PagedResult } from './types';

export type ClientStatus = 'Pending' | 'Active' | 'Inactive' | 'Declined' | 'Closed';

export interface ClientListItem {
  id: number;
  accountNo: string | null;
  displayName: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  mobile: string | null;
  bvn: string | null;
  officeId: number | null;
  staffId: number | null;
  status: ClientStatus;
  clientType: string | null;
  joinedDate: string | null;
}

export interface ClientListFilters {
  search?: string;
  officeId?: number;
  status?: ClientStatus;
  page?: number;
  pageSize?: number;
}

export const clientsApi = {
  async list(filters: ClientListFilters): Promise<PagedResult<ClientListItem>> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.officeId) params.set('officeId', String(filters.officeId));
    if (filters.status) params.set('status', filters.status);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 15));

    const response = await apiClient.get<PagedResult<ClientListItem>>(`/clients?${params.toString()}`);
    return response.data;
  },
};
