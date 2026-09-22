import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { FtLot, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChargeParams, ConfirmParams, GrantParams } from './ft.types.js';

// Se gasta primero el lote que expira antes (ej. el regalo mensual); los que
// no expiran (compras) se dejan para el final. Se ordena en JS: en MySQL los
// NULL de `expiresAt` quedarían primero en ASC, justo al revés de lo que
// se necesita aquí.
function sortByBurnOrder(lots: FtLot[]): FtLot[] {
  return [...lots].sort((a, b) => {
    if (a.expiresAt === null) return b.expiresAt === null ? 0 : 1;
    if (b.expiresAt === null) return -1;
    return a.expiresAt.getTime() - b.expiresAt.getTime();
  });
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class FtService {
  private readonly logger = new Logger(FtService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async findActiveLots(client: Tx | PrismaService, organizationId: string): Promise<FtLot[]> {
    const lots = await client.ftLot.findMany({
      where: {
        organizationId,
        amount: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return sortByBurnOrder(lots);
  }

  async getBalance(organizationId: string) {
    const lots = await this.findActiveLots(this.prisma, organizationId);
    const balance = lots.reduce((sum, lot) => sum + lot.amount, 0);
    return { balance, lots };
  }

  // Catálogo de costos por acción, para que la app muestre "Analizar (2 FT)"
  // sin tener los precios hardcodeados (Superadmin los podrá editar, Fase 9).
  getCatalog() {
    return this.prisma.ftServiceConfig.findMany({ orderBy: { key: 'asc' } });
  }

  getConfigValue(key: string, fallback: number) {
    return this.prisma.ftConfig.findUnique({ where: { key } }).then((row) => row?.value ?? fallback);
  }

  getTransactions(organizationId: string, take = 50) {
    return this.prisma.ftTransaction.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, name: true, username: true } } },
    });
  }

  // Paso 1 del patrón hold/confirm/release: retiene el costo ANTES de llamar a
  // Gemini. Si la acción de IA falla después, quien la llama debe avisar con
  // `release()` para devolver el saldo; si sale bien, con `confirm()`.
  async charge(params: ChargeParams) {
    const { organizationId, userId, service, idempotencyKey, metadata } = params;

    const existing = await this.prisma.ftTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return { transaction: existing, alreadyProcessed: true };
    }

    const config = await this.prisma.ftServiceConfig.findUnique({ where: { key: service } });
    if (!config || !config.active) {
      throw new HttpException('Este servicio de IA no está disponible por ahora', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const cost = config.ftCost;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const lots = await this.findActiveLots(tx, organizationId);
      const available = lots.reduce((sum, lot) => sum + lot.amount, 0);
      if (available < cost) {
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            message: 'No tienes suficientes FrikiTokens para esta acción',
            code: 'INSUFFICIENT_FT',
            required: cost,
            available,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      let remaining = cost;
      for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(lot.amount, remaining);
        await tx.ftLot.update({ where: { id: lot.id }, data: { amount: { decrement: take } } });
        remaining -= take;
      }

      return tx.ftTransaction.create({
        data: {
          organizationId,
          userId,
          type: 'CHARGE',
          service,
          status: 'HELD',
          ftAmount: cost,
          idempotencyKey,
          metadata,
        },
      });
    });

    return { transaction, alreadyProcessed: false };
  }

  async confirm(transactionId: string, params: ConfirmParams = {}) {
    const transaction = await this.prisma.ftTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        realCostUsd: params.realCostUsd,
      },
    });

    if (params.usageEventType && transaction.userId) {
      await this.prisma.usageEvent.create({
        data: { userId: transaction.userId, type: params.usageEventType, metadata: params.usageEventMetadata },
      });
    }

    return transaction;
  }

  // Si la llamada a Gemini falla después del hold, se devuelve el saldo como
  // un lote nuevo (sin intentar reconstruir de qué lote exacto había salido:
  // para el balance total da igual, y así se evita una lógica más compleja
  // sin ganar nada).
  async release(transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.ftTransaction.update({
        where: { id: transactionId },
        data: { status: 'RELEASED' },
      });
      await tx.ftLot.create({
        data: {
          organizationId: transaction.organizationId,
          source: 'REFUND',
          amount: transaction.ftAmount,
          originalAmount: transaction.ftAmount,
          expiresAt: null,
        },
      });
      return transaction;
    });
  }

  // Envuelve una acción de IA con el patrón completo: retiene el costo, corre
  // `action`, y confirma o libera el cobro según el resultado. Es el punto de
  // entrada que deben usar los demás módulos (ej. ItemsService) en vez de
  // llamar charge/confirm/release a mano.
  async runChargedAction<T>(
    params: ChargeParams,
    action: () => Promise<{ data: T; realCostUsd?: number; usageEventType?: ConfirmParams['usageEventType']; usageEventMetadata?: ConfirmParams['usageEventMetadata'] }>,
  ): Promise<T> {
    const { transaction, alreadyProcessed } = await this.charge(params);
    if (alreadyProcessed) {
      // Ya se cobró (y presumiblemente ya se ejecutó) esta misma acción antes;
      // no se vuelve a llamar a Gemini. El cliente debe reusar la respuesta
      // que ya recibió la primera vez.
      throw new HttpException(
        'Esta acción ya se procesó antes (reintento detectado)',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const { data, realCostUsd, usageEventType, usageEventMetadata } = await action();
      await this.confirm(transaction.id, { realCostUsd, usageEventType, usageEventMetadata });
      return data;
    } catch (error) {
      await this.release(transaction.id).catch((releaseError) => {
        this.logger.error(`No se pudo liberar el hold de FT ${transaction.id}`, releaseError);
      });
      throw error;
    }
  }

  async grant(params: GrantParams) {
    const existing = await this.prisma.ftTransaction.findUnique({ where: { idempotencyKey: params.idempotencyKey } });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      await tx.ftLot.create({
        data: {
          organizationId: params.organizationId,
          source: params.source,
          amount: params.amount,
          originalAmount: params.amount,
          expiresAt: params.expiresAt ?? null,
        },
      });
      return tx.ftTransaction.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId ?? null,
          type: 'GRANT',
          status: 'CONFIRMED',
          ftAmount: params.amount,
          idempotencyKey: params.idempotencyKey,
          confirmedAt: new Date(),
        },
      });
    });
  }
}
