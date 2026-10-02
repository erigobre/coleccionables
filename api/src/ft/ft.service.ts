import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { FtLot, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChargeParams, ConfirmParams, GrantParams } from './ft.types.js';

const ACTIVE_SUBSCRIPTION_STATUSES = ['ACTIVE', 'SPONSORED'] as const;

// Rango de consumo (plan "3 monederos", Oct 2026): gratis/promo/referido/
// reembolso primero, luego suscripción, al final lo comprado — así nunca se
// queman primero los FT que la persona pagó. Dentro de cada rango se sigue
// gastando primero el lote que expira antes (ej. el regalo mensual); los que
// no expiran (compras) se dejan para el final. Se ordena en JS: en MySQL los
// NULL de `expiresAt` quedarían primero en ASC, justo al revés de lo que se
// necesita aquí.
const BURN_RANK: Record<FtLot['source'], number> = {
  MONTHLY_FREE: 0,
  PROMO: 0,
  REFERRAL: 0,
  REFUND: 0,
  SUBSCRIPTION: 1,
  PURCHASE: 2,
};

function sortByBurnOrder(lots: FtLot[]): FtLot[] {
  return [...lots].sort((a, b) => {
    const rankDiff = BURN_RANK[a.source] - BURN_RANK[b.source];
    if (rankDiff !== 0) return rankDiff;
    if (a.expiresAt === null) return b.expiresAt === null ? 0 : 1;
    if (b.expiresAt === null) return -1;
    return a.expiresAt.getTime() - b.expiresAt.getTime();
  });
}

// Agrupa lotes en los 3 monederos que ve la persona: "free" junta todo lo que
// no es ni suscripción ni compra (promo/referido/reembolso se sienten igual
// de "regalo" para el usuario, no amerita un 4to grupo en la UI).
function summarizeWallets(lots: FtLot[]) {
  let free = 0;
  let subscription = 0;
  let purchased = 0;
  for (const lot of lots) {
    if (lot.source === 'SUBSCRIPTION') subscription += lot.amount;
    else if (lot.source === 'PURCHASE') purchased += lot.amount;
    else free += lot.amount;
  }
  return { free, subscription, purchased };
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class FtService {
  private readonly logger = new Logger(FtService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Busca el lote personal (userId = esta persona, sigue a la persona sin
  // importar su Organization) UNIONADO con los lotes compartidos de su
  // Organization actual (userId null). Dentro de los compartidos: el PROMO
  // (regalo manual del admin, independiente de cualquier plan) siempre cuenta;
  // el SUBSCRIPTION solo cuenta si la Organization tiene de verdad una
  // suscripción activa — si se cancela, ese monedero simplemente deja de
  // aparecer, sin tocar ninguna fila.
  private async findActiveLots(client: Tx | PrismaService, userId: string): Promise<FtLot[]> {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, organization: { select: { subscriptionStatus: true, activeFtPlanId: true } } },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hasActiveSubscription =
      user.organization.activeFtPlanId !== null &&
      (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(user.organization.subscriptionStatus);

    const lots = await client.ftLot.findMany({
      where: {
        amount: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        AND: [
          {
            OR: [
              { userId },
              { organizationId: user.organizationId, userId: null, source: 'PROMO' },
              ...(hasActiveSubscription
                ? [{ organizationId: user.organizationId, userId: null, source: 'SUBSCRIPTION' as const }]
                : []),
            ],
          },
        ],
      },
    });
    return sortByBurnOrder(lots);
  }

  async getBalance(userId: string) {
    const lots = await this.findActiveLots(this.prisma, userId);
    const balance = lots.reduce((sum, lot) => sum + lot.amount, 0);
    return { balance, ...summarizeWallets(lots), lots };
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

  // Estado de cuenta descargable del mes (decisión #7 del plan de Ajustes:
  // CSV, no PDF — no hay ninguna librería de generación de PDF en el
  // proyecto). `month` viene como "YYYY-MM" desde la app.
  async getMonthlyStatementCsv(organizationId: string, month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpException('Formato de mes inválido, se espera YYYY-MM', HttpStatus.BAD_REQUEST);
    }
    const [year, monthIndex] = month.split('-').map(Number);
    const periodStart = new Date(year, monthIndex - 1, 1);
    const periodEnd = new Date(year, monthIndex, 1);

    const transactions = await this.prisma.ftTransaction.findMany({
      where: { organizationId, createdAt: { gte: periodStart, lt: periodEnd } },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true, username: true } } },
    });

    const header = 'Fecha,Tipo,Servicio,Persona,Monto,Estado';
    const rows = transactions.map((transaction) => {
      const fecha = transaction.createdAt.toISOString();
      const tipo = transaction.type === 'GRANT' ? 'Regalo' : 'Cargo';
      const servicio = transaction.service ?? '';
      const persona = transaction.user?.username ?? transaction.user?.name ?? '';
      const monto = transaction.type === 'GRANT' ? transaction.ftAmount : -transaction.ftAmount;
      const estado = transaction.status;
      return [fecha, tipo, servicio, persona, monto, estado]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',');
    });

    const csv = [header, ...rows].join('\n');
    return {
      filename: `frikidex-estado-de-cuenta-${month}.csv`,
      mimeType: 'text/csv',
      base64: Buffer.from(csv, 'utf-8').toString('base64'),
    };
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
      const lots = await this.findActiveLots(tx, userId);
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
          userId: transaction.userId ?? null,
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
          userId: params.userId ?? null,
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
