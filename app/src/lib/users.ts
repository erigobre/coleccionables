import { apiFetch, type AuthTokens } from './api';
import { compressPhoto } from './image';

export interface Me {
  id: string;
  email: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'MEMBER' | 'SUPERADMIN';
  organizationId: string;
  emailVerified: boolean;
  usernameChangedAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    plan: string | null;
    subscriptionStatus: string;
    sponsored: boolean;
  };
}

export function fetchMe(accessToken: string) {
  return apiFetch<Me>('/users/me', { accessToken });
}

export function updateMe(accessToken: string, dto: { name?: string; avatarUrl?: string }) {
  return apiFetch<AuthTokens>('/users/me', { method: 'PATCH', body: dto, accessToken });
}

export function updateUsername(accessToken: string, username: string) {
  return apiFetch<AuthTokens>('/users/me/username', { method: 'PATCH', body: { username }, accessToken });
}

export function changePassword(accessToken: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ success: true }>('/users/me/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
    accessToken,
  });
}

export function sendEmailVerification(accessToken: string) {
  return apiFetch<{ alreadyVerified: boolean }>('/users/me/email/send-verification', {
    method: 'POST',
    accessToken,
  });
}

export function deleteAccount(accessToken: string) {
  return apiFetch<{ deletionRequestedAt: string; deleteAfter: string }>('/users/me', {
    method: 'DELETE',
    accessToken,
  });
}

// Sube la foto ya recortada (mismo endpoint que las fotos de objetos) y
// devuelve la URL relativa que luego se manda a updateMe como avatarUrl.
export async function uploadAvatar(accessToken: string, croppedUri: string): Promise<string> {
  const photo = await compressPhoto(croppedUri);
  const { url } = await apiFetch<{ url: string }>('/storage/upload', {
    method: 'POST',
    body: { imageBase64: photo.base64, mimeType: 'image/jpeg' },
    accessToken,
  });
  return url;
}
