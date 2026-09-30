'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch } from '@/lib/backend';

export interface ResolveFlagState {
  error?: string;
}

export async function resolveFlagAction(
  flagId: string,
  _prevState: ResolveFlagState,
  formData: FormData,
): Promise<ResolveFlagState> {
  const resolution = String(formData.get('resolution') ?? '').trim() || undefined;
  const reactivateUser = formData.get('reactivateUser') === 'on';
  const approveItemRaw = formData.get('approveItem');
  const approveItem = approveItemRaw === null ? undefined : approveItemRaw === 'true';

  try {
    await backendFetch(`/admin/moderation-flags/${flagId}/resolve`, {
      method: 'PATCH',
      body: { resolution, reactivateUser, approveItem },
    });
  } catch {
    return { error: 'No se pudo resolver el incidente' };
  }

  revalidatePath('/moderacion');
  return {};
}

// Aprobar de un clic (sin diálogo): el caso rápido y sin fricción que pidió el
// usuario — el objeto retenido pasa a ACTIVE y ya aparece en Objetos.
export async function approveItemFlagAction(flagId: string): Promise<void> {
  await backendFetch(`/admin/moderation-flags/${flagId}/resolve`, {
    method: 'PATCH',
    body: { approveItem: true },
  });
  revalidatePath('/moderacion');
}

// Suspender/reactivar desde la misma tarjeta, sin salir de Moderación
// ("suspender al usuario desde ahí de una manera rápida", pedido 2026-09-29).
export async function quickSuspendUserAction(userId: string): Promise<void> {
  await backendFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH' });
  revalidatePath('/moderacion');
}

export async function quickReactivateUserAction(userId: string): Promise<void> {
  await backendFetch(`/admin/users/${userId}/reactivate`, { method: 'PATCH' });
  revalidatePath('/moderacion');
}
