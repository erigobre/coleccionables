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
  source: 'MONTHLY_FREE' | 'PURCHASE' | 'PROMO' | 'REFUND';
  amount: number;
  originalAmount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface FtBalance {
  balance: number;
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
