'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch } from '@/lib/backend';

export interface UpdateFtConfigState {
  error?: string;
}

export async function updateFtConfigAction(
  key: string,
  _prevState: UpdateFtConfigState,
  formData: FormData,
): Promise<UpdateFtConfigState> {
  const value = Number(formData.get('value'));

  if (!Number.isInteger(value) || value < 0) {
    return { error: 'El valor debe ser un número entero mayor o igual a 0' };
  }

  try {
    await backendFetch(`/admin/ft-config/${key}`, { method: 'PATCH', body: { value } });
  } catch {
    return { error: 'No se pudo guardar el cambio' };
  }

  revalidatePath('/ajustes');
  return {};
}

export interface UpdateFtServiceConfigState {
  error?: string;
}

export async function updateFtServiceConfigAction(
  key: string,
  _prevState: UpdateFtServiceConfigState,
  formData: FormData,
): Promise<UpdateFtServiceConfigState> {
  const ftCost = Number(formData.get('ftCost'));
  const active = formData.get('active') === 'on';

  if (!Number.isInteger(ftCost) || ftCost < 0) {
    return { error: 'El costo debe ser un número entero mayor o igual a 0' };
  }

  try {
    await backendFetch(`/admin/ft-service-config/${key}`, { method: 'PATCH', body: { ftCost, active } });
  } catch {
    return { error: 'No se pudo guardar el cambio' };
  }

  revalidatePath('/ajustes');
  return {};
}
