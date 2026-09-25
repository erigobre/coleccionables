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

  try {
    await backendFetch(`/admin/moderation-flags/${flagId}/resolve`, {
      method: 'PATCH',
      body: { resolution, reactivateUser },
    });
  } catch {
    return { error: 'No se pudo resolver el incidente' };
  }

  revalidatePath('/moderacion');
  return {};
}
