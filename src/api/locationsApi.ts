import apiClient from './apiClient';

export interface State {
  id: number;
  name: string;
}

export interface Lga {
  id: number;
  stateId: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  lgaId: number;
  lgaName: string;
  stateId: number;
  stateName: string;
  officeCount: number;
}

export interface SaveCityInput {
  lgaId: number;
  name: string;
}

/** States and LGAs are fixed (seeded); cities are added by super admins. */
export const locationsApi = {
  async states(): Promise<State[]> {
    const response = await apiClient.get<State[]>('/locations/states');
    return response.data;
  },

  async lgas(stateId?: number): Promise<Lga[]> {
    const response = await apiClient.get<Lga[]>('/locations/lgas', { params: { stateId } });
    return response.data;
  },

  async cities(filters: { stateId?: number; lgaId?: number } = {}): Promise<City[]> {
    const response = await apiClient.get<City[]>('/locations/cities', { params: filters });
    return response.data;
  },

  async createCity(input: SaveCityInput): Promise<City> {
    const response = await apiClient.post<City>('/locations/cities', input);
    return response.data;
  },

  async updateCity(id: number, input: SaveCityInput): Promise<City> {
    const response = await apiClient.put<City>(`/locations/cities/${id}`, input);
    return response.data;
  },

  async deleteCity(id: number): Promise<void> {
    await apiClient.delete(`/locations/cities/${id}`);
  },
};
