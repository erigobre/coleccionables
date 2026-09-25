'use server';

import { revalidatePath } from 'next/cache';
import { backendFetch } from '@/lib/backend';

export async function sponsorAction(organizationId: string): Promise<void> {
  await backendFetch(`/admin/organizations/${organizationId}/sponsor`, { method: 'PATCH' });
  revalidatePath('/organizaciones');
}

export async function unsponsorAction(organizationId: string): Promise<void> {
  await backendFetch(`/admin/organizations/${organizationId}/unsponsor`, { method: 'PATCH' });
  revalidatePath('/organizaciones');
}

export interface AddPaymentState {
  error?: string;
}

export async function addPaymentAction(
  organizationId: string,
  _prevState: AddPaymentState,
  formData: FormData,
): Promise<AddPaymentState> {
  const amount = Number(formData.get('amount'));
  const currency = String(formData.get('currency') ?? '').trim() || undefined;
  const status = String(formData.get('status') ?? '').trim() || undefined;
  const periodStart = String(formData.get('periodStart') ?? '');
  const periodEnd = String(formData.get('periodEnd') ?? '');

  if (!amount || amount <= 0) {
    return { error: 'El monto debe ser mayor a 0' };
  }
  if (!periodStart || !periodEnd) {
    return { error: 'Indica el periodo del pago' };
  }

  try {
    await backendFetch(`/admin/organizations/${organizationId}/payments`, {
      method: 'POST',
      body: { amount, currency, status, periodStart, periodEnd },
    });
  } catch {
    return { error: 'No se pudo registrar el pago' };
  }

  revalidatePath('/organizaciones');
  return {};
}
