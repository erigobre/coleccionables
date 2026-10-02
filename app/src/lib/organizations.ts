import { apiFetch } from './api';

export interface OrganizationMember {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'MEMBER' | 'SUPERADMIN';
}

export interface OrganizationFtPlan {
  id: string;
  code: string;
  label: string;
  ftAmountMonthly: number;
  maxInvitedMembers: number;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  subscriptionStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'SPONSORED';
  sponsored: boolean;
  activeFtPlan: OrganizationFtPlan | null;
  members: OrganizationMember[];
  myRole: 'OWNER' | 'MEMBER' | 'SUPERADMIN';
}

export function fetchOrganizationInfo(accessToken: string) {
  return apiFetch<OrganizationInfo>('/organizations/me', { accessToken });
}

export function cancelSubscription(accessToken: string) {
  return apiFetch<{ success: true }>('/organizations/me/subscription/cancel', { method: 'POST', accessToken });
}

export interface InviteOrCreateMemberResult {
  created: boolean;
  invited: boolean;
  userId?: string;
  inviteId?: string;
}

export function inviteOrCreateMember(
  accessToken: string,
  dto: { name: string; email: string; temporaryPassword: string },
) {
  return apiFetch<InviteOrCreateMemberResult>('/organizations/me/members', {
    method: 'POST',
    body: dto,
    accessToken,
  });
}

export function removeOrgMember(accessToken: string, memberUserId: string) {
  return apiFetch<{ success: true }>(`/organizations/me/members/${memberUserId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export interface OrganizationInvite {
  id: string;
  createdAt: string;
  organization: { name: string };
  invitedByUser: { name: string; username: string | null };
}

export function fetchMyInvites(accessToken: string) {
  return apiFetch<OrganizationInvite[]>('/organizations/me/invites', { accessToken });
}

export function acceptInvite(accessToken: string, inviteId: string) {
  return apiFetch<{ success: true }>(`/organizations/invite/${inviteId}/accept`, { method: 'POST', accessToken });
}

export function rejectInvite(accessToken: string, inviteId: string) {
  return apiFetch<{ success: true }>(`/organizations/invite/${inviteId}/reject`, { method: 'POST', accessToken });
}
