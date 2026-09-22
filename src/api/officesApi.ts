import apiClient from './apiClient';

export interface Office {
  id: number;
  name: string | null;
  parentId: number | null;
  externalId: string | null;
  openingDate: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  managerId: number | null;
  active: boolean;
  defaultOffice: boolean;
}

export interface SaveOfficeInput {
  name: string;
  parentId?: number | null;
  externalId?: string | null;
  openingDate?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  managerId?: number | null;
  defaultOffice?: boolean;
}

export interface OfficeInUse {
  activeClientCount: number;
  openLoanCount: number;
}

export const officesApi = {
  async list(): Promise<Office[]> {
    const response = await apiClient.get<Office[]>('/offices');
    return response.data;
  },

  async get(id: number): Promise<Office> {
    const response = await apiClient.get<Office>(`/offices/${id}`);
    return response.data;
  },

  async create(input: SaveOfficeInput): Promise<Office> {
    const response = await apiClient.post<Office>('/offices', input);
    return response.data;
  },

  async update(id: number, input: SaveOfficeInput): Promise<Office> {
    const response = await apiClient.put<Office>(`/offices/${id}`, input);
    return response.data;
  },

  async activate(id: number): Promise<Office> {
    const response = await apiClient.post<Office>(`/offices/${id}/activate`);
    return response.data;
  },

  /** Throws an ApiError with status 409 and responseData shaped as OfficeInUse if not confirmed and the office is in use. */
  async deactivate(id: number, confirm = false): Promise<Office> {
    const response = await apiClient.post<Office>(`/offices/${id}/deactivate?confirm=${confirm}`);
    return response.data;
  },
};
