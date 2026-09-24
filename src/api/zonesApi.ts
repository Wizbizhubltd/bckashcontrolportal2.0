import apiClient from './apiClient';

export interface Zone {
  id: number;
  name: string;
  description: string | null;
  officeCount: number;
  /** Staff assigned to the zone's offices — a zone with staff can't be deleted. */
  staffCount: number;
  createdAt: string | null;
  createdById: number | null;
  createdByName: string | null;
}

export interface SaveZoneInput {
  name: string;
  description?: string | null;
}

/** Anyone signed in can read zones; only super admins can change them. */
export const zonesApi = {
  async list(): Promise<Zone[]> {
    const response = await apiClient.get<Zone[]>('/zones');
    return response.data;
  },

  async create(input: SaveZoneInput): Promise<Zone> {
    const response = await apiClient.post<Zone>('/zones', input);
    return response.data;
  },

  async update(id: number, input: SaveZoneInput): Promise<Zone> {
    const response = await apiClient.put<Zone>(`/zones/${id}`, input);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/zones/${id}`);
  },
};
