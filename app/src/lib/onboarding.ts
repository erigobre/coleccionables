import { apiFetch } from './api';

export type OnboardingOptionKind = 'COLLECTING' | 'LOCATION';
export type ThemePreference = 'MORADO' | 'NEGRO' | 'ROSA';

export interface OnboardingOption {
  id: string;
  kind: OnboardingOptionKind;
  code: string;
  label: string;
  icon: string;
  sortOrder: number;
}

export interface OnboardingOptions {
  collecting: OnboardingOption[];
  locations: OnboardingOption[];
}

export function fetchOnboardingOptions(accessToken: string) {
  return apiFetch<OnboardingOptions>('/onboarding/options', { accessToken });
}

export interface OnboardingStatus {
  completed: boolean;
  welcomeGiftAmount: number;
}

export function fetchOnboardingStatus(accessToken: string) {
  return apiFetch<OnboardingStatus>('/onboarding/status', { accessToken });
}

export function completeOnboarding(
  accessToken: string,
  dto: { collectingCodes: string[]; locationCodes: string[]; theme: ThemePreference },
) {
  return apiFetch<void>('/onboarding/complete', { method: 'POST', body: dto, accessToken });
}
