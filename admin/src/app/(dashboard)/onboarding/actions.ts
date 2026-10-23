'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch, BackendError } from '@/lib/backend';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof BackendError ? error.message : fallback;
}

export interface OnboardingOptionFormState {
  error?: string;
}

export async function createOnboardingOptionAction(
  kind: 'COLLECTING' | 'LOCATION',
  _prevState: OnboardingOptionFormState,
  formData: FormData,
): Promise<OnboardingOptionFormState> {
  const code = String(formData.get('code') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const icon = String(formData.get('icon') ?? '').trim();
  const sortOrder = formData.get('sortOrder') ? Number(formData.get('sortOrder')) : undefined;

  if (!code) return { error: 'El código es obligatorio' };
  if (!label) return { error: 'La etiqueta es obligatoria' };
  if (!icon) return { error: 'El ícono es obligatorio' };

  try {
    await backendFetch('/admin/onboarding-options', {
      method: 'POST',
      body: { kind, code, label, icon, sortOrder },
    });
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo crear la opción (¿el código ya existe?)') };
  }

  revalidatePath('/onboarding');
  return {};
}

export async function updateOnboardingOptionAction(
  optionId: string,
  _prevState: OnboardingOptionFormState,
  formData: FormData,
): Promise<OnboardingOptionFormState> {
  const label = String(formData.get('label') ?? '').trim();
  const icon = String(formData.get('icon') ?? '').trim();
  const sortOrder = formData.get('sortOrder') ? Number(formData.get('sortOrder')) : undefined;
  const isActive = formData.get('isActive') === 'on';

  if (!label) return { error: 'La etiqueta es obligatoria' };
  if (!icon) return { error: 'El ícono es obligatorio' };

  try {
    await backendFetch(`/admin/onboarding-options/${optionId}`, {
      method: 'PATCH',
      body: { label, icon, sortOrder, isActive },
    });
  } catch (error) {
    return { error: errorMessage(error, 'No se pudo actualizar la opción') };
  }

  revalidatePath('/onboarding');
  return {};
}
