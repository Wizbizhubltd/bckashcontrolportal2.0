import apiClient from './apiClient';
import type { PagedResult } from './types';

export type UserClass = 'Initiator' | 'Authorizer' | 'Reviewer';
export type OnboardingStatus = 'Approved' | 'Pending' | 'Declined';
export type Gender = 'Unspecified' | 'Male' | 'Female' | 'Other';

export const USER_TYPE_SLUGS = ['super_admin', 'controller', 'director', 'manager', 'marketer'] as const;
export type UserTypeSlug = (typeof USER_TYPE_SLUGS)[number];

export interface StaffUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  officeId: number | null;
  officeName: string | null;
  userType: string | null;
  userClass: UserClass | null;
  blocked: boolean;
  onboardingStatus: OnboardingStatus;
  createdById: number | null;
  onboardingApprovedById: number | null;
  onboardingApprovedDate: string | null;
  onboardingDeclinedById: number | null;
  onboardingDeclinedDate: string | null;
  onboardingDeclinedReason: string | null;
  lastLogin: string | null;
}

export interface StaffListFilters {
  officeId?: number;
  userType?: string;
  onboardingStatus?: OnboardingStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStaffInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  officeId?: number | null;
  userTypeSlug: string;
  userClass: UserClass;
  gender?: Gender | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateStaffInput {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  gender?: Gender | null;
}

function buildQuery(filters: StaffListFilters): string {
  const params = new URLSearchParams();
  if (filters.officeId) params.set('officeId', String(filters.officeId));
  if (filters.userType) params.set('userType', filters.userType);
  if (filters.onboardingStatus) params.set('onboardingStatus', filters.onboardingStatus);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 20));
  return params.toString();
}

export const usersApi = {
  async list(filters: StaffListFilters): Promise<PagedResult<StaffUser>> {
    const response = await apiClient.get<PagedResult<StaffUser>>(`/users?${buildQuery(filters)}`);
    return response.data;
  },

  async get(id: number): Promise<StaffUser> {
    const response = await apiClient.get<StaffUser>(`/users/${id}`);
    return response.data;
  },

  async me(): Promise<StaffUser> {
    const response = await apiClient.get<StaffUser>('/users/me');
    return response.data;
  },

  async create(input: CreateStaffInput): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>('/users', input);
    return response.data;
  },

  async update(id: number, input: UpdateStaffInput): Promise<StaffUser> {
    const response = await apiClient.put<StaffUser>(`/users/${id}`, input);
    return response.data;
  },

  async approveOnboarding(id: number): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/approve-onboarding`);
    return response.data;
  },

  async declineOnboarding(id: number, reason: string): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/decline-onboarding`, { reason });
    return response.data;
  },

  async assignOffice(id: number, officeId: number): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/assign-office`, { officeId });
    return response.data;
  },

  async changeUserType(id: number, userTypeSlug: string): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/change-user-type`, { userTypeSlug });
    return response.data;
  },

  async changeUserClass(id: number, userClass: UserClass): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/change-user-class`, { userClass });
    return response.data;
  },

  async block(id: number): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/block`);
    return response.data;
  },

  async unblock(id: number): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/unblock`);
    return response.data;
  },

  async resetPassword(id: number): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/reset-password`);
    return response.data;
  },
};
