'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch } from '@/lib/backend';

export interface FtPackageFormState {
  error?: string;
}

function toCents(pesos: string): number | undefined {
  const value = Number(pesos);
  if (!pesos || Number.isNaN(value)) return undefined;
  return Math.round(value * 100);
}

export async function createFtPackageAction(
  _prevState: FtPackageFormState,
  formData: FormData,
): Promise<FtPackageFormState> {
  const code = String(formData.get('code') ?? '').trim();
  const ftAmount = Number(formData.get('ftAmount'));
  const priceMxnCents = toCents(String(formData.get('priceMxn') ?? ''));
  const badge = String(formData.get('badge') ?? '').trim() || undefined;
  const sortOrder = formData.get('sortOrder') ? Number(formData.get('sortOrder')) : undefined;

  if (!code) return { error: 'El código es obligatorio' };
  if (!ftAmount || ftAmount <= 0) return { error: 'La cantidad de FT debe ser mayor a 0' };
  if (!priceMxnCents || priceMxnCents <= 0) return { error: 'El precio debe ser mayor a 0' };

  try {
    await backendFetch('/admin/ft-packages', {
      method: 'POST',
      body: { code, ftAmount, priceMxnCents, badge, sortOrder },
    });
  } catch {
    return { error: 'No se pudo crear el paquete (¿el código ya existe?)' };
  }

  revalidatePath('/frikitokens');
  return {};
}

export async function updateFtPackageAction(
  packageId: string,
  _prevState: FtPackageFormState,
  formData: FormData,
): Promise<FtPackageFormState> {
  const ftAmount = Number(formData.get('ftAmount'));
  const priceMxnCents = toCents(String(formData.get('priceMxn') ?? ''));
  const badge = String(formData.get('badge') ?? '').trim() || undefined;
  const sortOrder = formData.get('sortOrder') ? Number(formData.get('sortOrder')) : undefined;
  const isActive = formData.get('isActive') === 'on';

  if (!ftAmount || ftAmount <= 0) return { error: 'La cantidad de FT debe ser mayor a 0' };
  if (!priceMxnCents || priceMxnCents <= 0) return { error: 'El precio debe ser mayor a 0' };

  try {
    await backendFetch(`/admin/ft-packages/${packageId}`, {
      method: 'PATCH',
      body: { ftAmount, priceMxnCents, badge, sortOrder, isActive },
    });
  } catch {
    return { error: 'No se pudo actualizar el paquete' };
  }

  revalidatePath('/frikitokens');
  return {};
}

export interface FtPlanFormState {
  error?: string;
}

export async function createFtPlanAction(
  _prevState: FtPlanFormState,
  formData: FormData,
): Promise<FtPlanFormState> {
  const code = String(formData.get('code') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();
  const ftAmountMonthly = Number(formData.get('ftAmountMonthly'));
  const monthlyPriceMxnCents = toCents(String(formData.get('monthlyPriceMxn') ?? ''));
  const badge = String(formData.get('badge') ?? '').trim() || undefined;
  const sortOrder = formData.get('sortOrder') ? Number(formData.get('sortOrder')) : undefined;

  if (!code) return { error: 'El código es obligatorio' };
  if (!label) return { error: 'La etiqueta es obligatoria' };
  if (!ftAmountMonthly || ftAmountMonthly <= 0) return { error: 'La cantidad de FT/mes debe ser mayor a 0' };
  if (!monthlyPriceMxnCents || monthlyPriceMxnCents <= 0) return { error: 'El precio mensual debe ser mayor a 0' };

  try {
    await backendFetch('/admin/ft-plans', {
      method: 'POST',
      body: { code, label, ftAmountMonthly, monthlyPriceMxnCents, badge, sortOrder },
    });
  } catch {
    return { error: 'No se pudo crear el plan (¿el código ya existe?)' };
  }

  revalidatePath('/frikitokens');
  return {};
}

export async function updateFtPlanAction(
  planId: string,
  _prevState: FtPlanFormState,
  formData: FormData,
): Promise<FtPlanFormState> {
  const label = String(formData.get('label') ?? '').trim();
  const ftAmountMonthly = Number(formData.get('ftAmountMonthly'));
  const monthlyPriceMxnCents = toCents(String(formData.get('monthlyPriceMxn') ?? ''));
  const badge = String(formData.get('badge') ?? '').trim() || undefined;
  const sortOrder = formData.get('sortOrder') ? Number(formData.get('sortOrder')) : undefined;
  const isActive = formData.get('isActive') === 'on';

  if (!label) return { error: 'La etiqueta es obligatoria' };
  if (!ftAmountMonthly || ftAmountMonthly <= 0) return { error: 'La cantidad de FT/mes debe ser mayor a 0' };
  if (!monthlyPriceMxnCents || monthlyPriceMxnCents <= 0) return { error: 'El precio mensual debe ser mayor a 0' };

  try {
    await backendFetch(`/admin/ft-plans/${planId}`, {
      method: 'PATCH',
      body: { label, ftAmountMonthly, monthlyPriceMxnCents, badge, sortOrder, isActive },
    });
  } catch {
    return { error: 'No se pudo actualizar el plan' };
  }

  revalidatePath('/frikitokens');
  return {};
}
