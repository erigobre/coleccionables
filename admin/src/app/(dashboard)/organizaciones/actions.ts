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

export interface GrantFtState {
  error?: string;
}

// Regalo manual de FT sin pago (pedido 2026-09-25): queda registrado en el
// backend como lote PROMO y en la bitácora de admin como asignación sponsor.
export async function grantFtAction(
  organizationId: string,
  _prevState: GrantFtState,
  formData: FormData,
): Promise<GrantFtState> {
  const amount = Number(formData.get('amount'));
  const reason = String(formData.get('reason') ?? '').trim() || undefined;

  if (!amount || amount <= 0) {
    return { error: 'La cantidad de FT debe ser mayor a 0' };
  }

  try {
    await backendFetch(`/admin/organizations/${organizationId}/grant-ft`, {
      method: 'POST',
      body: { amount, reason },
    });
  } catch {
    return { error: 'No se pudo otorgar el regalo de FT' };
  }

  revalidatePath('/organizaciones');
  return {};
}

export interface EditOrganizationState {
  error?: string;
}

export async function updateOrganizationAction(
  organizationId: string,
  _prevState: EditOrganizationState,
  formData: FormData,
): Promise<EditOrganizationState> {
  const name = String(formData.get('name') ?? '').trim();
  const plan = String(formData.get('plan') ?? '').trim() || undefined;
  const subscriptionStatus = String(formData.get('subscriptionStatus') ?? '').trim() || undefined;

  if (!name) {
    return { error: 'El nombre es obligatorio' };
  }

  try {
    await backendFetch(`/admin/organizations/${organizationId}`, {
      method: 'PATCH',
      body: { name, plan, subscriptionStatus },
    });
  } catch {
    return { error: 'No se pudo actualizar la organización' };
  }

  revalidatePath('/organizaciones');
  return {};
}
