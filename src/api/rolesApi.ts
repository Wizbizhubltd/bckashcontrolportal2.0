import apiClient from './apiClient';

/** A permission that can be granted to a role (what it unlocks, in plain words). */
export interface Permission {
  slug: string;
  area: string;
  name: string;
  description: string;
}

/** An office-portal module a super admin can tick for a role. */
export interface PortalModule {
  slug: string;
  name: string;
  description: string;
}

export interface Role {
  id: number;
  slug: string;
  name: string;
  staffCount: number;
  /** Super Admin always has every permission and can't be edited. */
  locked: boolean;
  permissions: string[];
  /** Office-portal modules ticked for the role (always empty for Super Admin). */
  modules: string[];
}

/** Super admins only. */
export const rolesApi = {
  async list(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/roles');
    return response.data;
  },

  async permissions(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[]>('/roles/permissions');
    return response.data;
  },

  async modules(): Promise<PortalModule[]> {
    const response = await apiClient.get<PortalModule[]>('/roles/modules');
    return response.data;
  },

  async tickModule(roleId: number, slug: string): Promise<Role> {
    const response = await apiClient.post<Role>(`/roles/${roleId}/modules/${encodeURIComponent(slug)}`);
    return response.data;
  },

  async untickModule(roleId: number, slug: string): Promise<Role> {
    const response = await apiClient.delete<Role>(`/roles/${roleId}/modules/${encodeURIComponent(slug)}`);
    return response.data;
  },

  async grant(roleId: number, slug: string): Promise<Role> {
    const response = await apiClient.post<Role>(`/roles/${roleId}/permissions/${encodeURIComponent(slug)}`);
    return response.data;
  },

  async revoke(roleId: number, slug: string): Promise<Role> {
    const response = await apiClient.delete<Role>(`/roles/${roleId}/permissions/${encodeURIComponent(slug)}`);
    return response.data;
  },
};
