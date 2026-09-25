'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch } from '@/lib/backend';

export async function suspendUserAction(userId: string): Promise<void> {
  await backendFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH' });
  revalidatePath('/usuarios');
  revalidatePath(`/usuarios/${userId}`);
}

export async function reactivateUserAction(userId: string): Promise<void> {
  await backendFetch(`/admin/users/${userId}/reactivate`, { method: 'PATCH' });
  revalidatePath('/usuarios');
  revalidatePath(`/usuarios/${userId}`);
}

export interface EditUserState {
  error?: string;
}

export async function updateUserAction(
  userId: string,
  _prevState: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (!name || !email) {
    return { error: 'Nombre y correo son obligatorios' };
  }

  try {
    await backendFetch(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: { name, email },
    });
  } catch {
    return { error: 'No se pudo actualizar el usuario' };
  }

  revalidatePath(`/usuarios/${userId}`);
  revalidatePath('/usuarios');
  return {};
}
