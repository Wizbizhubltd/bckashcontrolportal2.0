import apiClient from './apiClient';

export interface Setting {
  id: number;
  settingKey: string;
  settingValue: string | null;
}

export const settingsApi = {
  async list(): Promise<Setting[]> {
    const response = await apiClient.get<Setting[]>('/settings');
    return response.data;
  },

  async create(settingKey: string, settingValue: string | null): Promise<Setting> {
    const response = await apiClient.post<Setting>('/settings', { settingKey, settingValue });
    return response.data;
  },

  async update(id: number, settingValue: string | null): Promise<void> {
    await apiClient.put(`/settings/${id}`, { settingValue });
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/settings/${id}`);
  },
};
