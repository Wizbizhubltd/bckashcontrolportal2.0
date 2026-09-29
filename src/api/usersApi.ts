import apiClient from './apiClient';
import type { BulkActionResult, PagedResult } from './types';

export type { BulkActionResult, BulkActionSkip } from './types';

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
  gender: Gender;
  address: string | null;
  notes: string | null;
  createdAt: string | null;
  createdByName: string | null;
  onboardingApprovedByName: string | null;
  /** Last change made through a staff-management action (sign-ins don't count). */
  updatedAt: string | null;
  updatedByName: string | null;
  // Onboarding details the staff member fills in from their office-portal profile.
  dateOfBirth: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelationship: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  /** Zones a director oversees — every office in them is theirs to manage. */
  zones: { id: number; name: string }[];
  /** Office-portal modules ticked for the staff member's role. */
  modules: string[];
  missingProfileFields: string[];
  profileComplete: boolean;
  /** Still on a temporary password an admin gave them — they haven't reset it yet. */
  mustChangePassword: boolean;
  /** When an admin last forced a password reset (single or bulk). */
  passwordResetRequestedAt: string | null;
  /** When the staff member last set their own password. */
  passwordChangedAt: string | null;
}

/** One audit-trail entry for an action the staff member took. */
export interface StaffActivity {
  id: number;
  module: string | null;
  action: string | null;
  notes: string | null;
  officeId: number | null;
  createdAt: string | null;
}

export interface StaffListFilters {
  officeId?: number;
  userType?: string;
  onboardingStatus?: OnboardingStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** A super admin's edit of a staff member's whole record. Office, role, class and status have their own actions. */
export interface UpdateStaffRecordInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: Gender;
  address: string | null;
  notes: string | null;
  dateOfBirth: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  nextOfKinRelationship: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
}

/** The ticked staff, or `all` to cover every staff member matching the list filters. */
export type BulkStaffTarget = { userIds: number[] } | { all: true; filters: Omit<StaffListFilters, 'page' | 'pageSize'> };

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

  async activity(id: number, page: number, pageSize: number): Promise<PagedResult<StaffActivity>> {
    const response = await apiClient.get<PagedResult<StaffActivity>>(`/users/${id}/activity?page=${page}&pageSize=${pageSize}`);
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

  /** Super admins only: edits the whole staff record, including the onboarding details staff fill in themselves. */
  async updateRecord(id: number, input: UpdateStaffRecordInput): Promise<StaffUser> {
    const response = await apiClient.put<StaffUser>(`/users/${id}/record`, input);
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

  /** Super admins only, bulk action: adds zones to those a director already oversees. */
  async addZones(id: number, zoneIds: number[]): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/zones`, { zoneIds });
    return response.data;
  },

  /** Super admins only: replaces every zone a director oversees. */
  async assignZones(id: number, zoneIds: number[]): Promise<StaffUser> {
    const response = await apiClient.put<StaffUser>(`/users/${id}/zones`, { zoneIds });
    return response.data;
  },

  /** Bulk action: emails each active staff member (super admins are exempt) an 8-character temporary password they must change on next sign-in. */
  async bulkResetPassword(target: BulkStaffTarget): Promise<BulkActionResult> {
    const body = 'all' in target ? { all: true, ...target.filters } : { userIds: target.userIds };
    const response = await apiClient.post<BulkActionResult>('/users/bulk/reset-password', body);
    return response.data;
  },

  /** Bulk action: moves the ticked active staff to an office. Staff whose clients have active loans are skipped. */
  async bulkTransfer(userIds: number[], officeId: number): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>('/users/bulk/transfer', { userIds, officeId });
    return response.data;
  },

  /** Bulk action: disables (blocks) the ticked active staff so they can't sign in. Super admins are exempt. */
  async bulkDisable(userIds: number[]): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>('/users/bulk/disable', { userIds });
    return response.data;
  },

  async resetPassword(id: number): Promise<StaffUser> {
    const response = await apiClient.post<StaffUser>(`/users/${id}/reset-password`);
    return response.data;
  },
};
