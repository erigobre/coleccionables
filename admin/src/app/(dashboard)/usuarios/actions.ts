'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch } from '@/lib/backend';

export async function suspendUserAction(userId: string): Promise<void> {
  await backendFetch(`/admin/users/${userId}/suspend`, { method: 'PATCH' });
  revalidatePath('/usuarios');
}

export async function reactivateUserAction(userId: string): Promise<void> {
  await backendFetch(`/admin/users/${userId}/reactivate`, { method: 'PATCH' });
  revalidatePath('/usuarios');
}
