import type { FtLotSource, FtServiceKey, Prisma, UsageEventType } from '@prisma/client';

export interface ChargeParams {
  organizationId: string;
  userId: string;
  service: FtServiceKey;
  // Generado por el cliente y reenviado sin cambios en reintentos, para que un
  // timeout de red no termine cobrando 2 veces la misma acción.
  idempotencyKey: string;
  metadata?: Prisma.InputJsonValue;
}

export interface ConfirmParams {
  realCostUsd?: number;
  // Si se manda, además de confirmar el cobro se registra un UsageEvent —
  // así el panel Superadmin (admin.service.ts getStats()) sigue funcionando
  // sin tener que leer la tabla de FrikiTokens.
  usageEventType?: UsageEventType;
  usageEventMetadata?: Prisma.InputJsonValue;
}

export interface GrantParams {
  organizationId: string;
  userId?: string | null;
  source: FtLotSource;
  amount: number;
  expiresAt?: Date | null;
  idempotencyKey: string;
}
