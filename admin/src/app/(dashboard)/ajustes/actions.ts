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
