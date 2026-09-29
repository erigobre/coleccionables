import { apiFetch } from './api';

export interface ReferralInfo {
  code: string;
  featureEnabled: boolean;
  limit: number;
  successfulThisMonth: number;
  alreadyReferred: boolean;
}

export function fetchMyReferralInfo(accessToken: string) {
  return apiFetch<ReferralInfo>('/referrals/me', { accessToken });
}

export function redeemReferralCode(accessToken: string, code: string) {
  return apiFetch<{ inviterName: string }>('/referrals/redeem', {
    method: 'POST',
    body: { code },
    accessToken,
  });
}
