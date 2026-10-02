import { apiFetch } from './api';

// Claves de servicio tal cual las define el backend (api/prisma/schema.prisma
// → FtServiceKey). El costo real vive en la BD (Superadmin lo podrá editar,
// Fase 9); acá solo se usan como llave para leer el catálogo.
export type FtServiceKey =
  | 'CREATE_WITH_AI'
  | 'SCAN_HAVE_IT'
  | 'BARCODE_LOOKUP'
  | 'MARKET_PRICE_FRESH'
  | 'MARKET_PRICE_CACHED';

export interface FtServiceConfig {
  key: FtServiceKey;
  label: string;
  ftCost: number;
  active: boolean;
}

export interface FtLot {
  id: string;
  source: 'MONTHLY_FREE' | 'PURCHASE' | 'PROMO' | 'REFUND' | 'REFERRAL' | 'SUBSCRIPTION';
  amount: number;
  originalAmount: number;
  expiresAt: string | null;
  createdAt: string;
}

// Los 3 monederos (plan de Ajustes/Wallet): gratis y comprado son siempre
// personales; subscription solo tiene saldo si la Organization tiene un plan
// activo (ver OrganizationsService / FtService.findActiveLots).
export interface FtBalance {
  balance: number;
  free: number;
  subscription: number;
  purchased: number;
  lots: FtLot[];
}

export function fetchFtBalance(accessToken: string) {
  return apiFetch<FtBalance>('/ft/balance', { accessToken });
}

export function fetchFtCatalog(accessToken: string) {
  return apiFetch<FtServiceConfig[]>('/ft/services', { accessToken });
}

export interface FtTransaction {
  id: string;
  type: 'CHARGE' | 'GRANT';
  service: FtServiceKey | null;
  status: 'HELD' | 'CONFIRMED' | 'RELEASED';
  ftAmount: number;
  createdAt: string;
  user: { id: string; name: string; username: string | null } | null;
}

export function fetchFtTransactions(accessToken: string, take?: number) {
  const query = take ? `?take=${take}` : '';
  return apiFetch<FtTransaction[]>(`/ft/transactions${query}`, { accessToken });
}

export interface FtStatementFile {
  filename: string;
  mimeType: string;
  base64: string;
}

// `month` en formato YYYY-MM.
export function fetchFtStatement(accessToken: string, month: string) {
  return apiFetch<FtStatementFile>(`/ft/transactions/statement?month=${encodeURIComponent(month)}`, { accessToken });
}

export interface FtPackageOption {
  code: string;
  ftAmount: number;
  priceMxnCents: number;
  badge: string | null;
}

// Público (sin auth) — mismo endpoint que usa la landing (frikidex.com) para
// pintar precios, así que el modal de "sin FrikiTokens" siempre muestra los
// mismos paquetes/precios que el resto del proyecto.
export function fetchFtPackages() {
  return apiFetch<{ packages: FtPackageOption[] }>('/ft/packages').then((r) => r.packages);
}

export interface FtPlanOption {
  code: string;
  label: string;
  ftAmountMonthly: number;
  monthlyPriceMxnCents: number;
  annualPriceMxnCents: number | null;
  annualEnabled: boolean;
  badge: string | null;
  maxInvitedMembers: number;
}

// Público (sin auth) — tabla de planes de suscripción familiar para la
// landing de beneficios (wallet/suscripcion.tsx). El botón de suscribirse
// sigue mostrando "Muy pronto" (decisión #1 del plan: sin cobro real todavía).
export function fetchFtPlans() {
  return apiFetch<{ plans: FtPlanOption[] }>('/ft/plans').then((r) => r.plans);
}
