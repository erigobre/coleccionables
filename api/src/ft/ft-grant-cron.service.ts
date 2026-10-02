import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from './ft.service.js';

const GRANT_INTERVAL_DAYS = 30;
const DEFAULT_MONTHLY_FREE_FT = 20;

@Injectable()
export class FtGrantCronService {
  private readonly logger = new Logger(FtGrantCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ftService: FtService,
  ) {}

  // Corre a diario (no "el día 1 de cada mes") para que cada persona tenga su
  // propio ciclo de 30 días desde su último regalo — así una cuenta creada a
  // mitad de mes no se queda sin FT hasta el día 1 del mes siguiente. Por
  // User (no por Organization): el monedero "gratis" es personal y sigue a
  // la persona sin importar su Organization (modelo de 3 monederos, Oct 2026).
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async grantDueUsers() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - GRANT_INTERVAL_DAYS);

    const due = await this.prisma.user.findMany({
      where: { OR: [{ ftFreeGrantAt: null }, { ftFreeGrantAt: { lte: threshold } }] },
      select: { id: true, organizationId: true },
    });

    if (due.length > 0) {
      const amount = await this.ftService.getConfigValue('MONTHLY_FREE_FT', DEFAULT_MONTHLY_FREE_FT);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + GRANT_INTERVAL_DAYS);

      for (const user of due) {
        await this.prisma.user.update({ where: { id: user.id }, data: { ftFreeGrantAt: new Date() } });
        await this.ftService.grant({
          organizationId: user.organizationId,
          userId: user.id,
          source: 'MONTHLY_FREE',
          amount,
          expiresAt,
          idempotencyKey: `monthly-free:${user.id}:${new Date().toISOString().slice(0, 10)}`,
        });
      }

      this.logger.log(`Regalo mensual de FT gratis otorgado a ${due.length} usuario(s)`);
    }

    await this.grantDueSubscriptions();
  }

  // Barrido independiente: el lote SUBSCRIPTION es compartido por toda la
  // Organization (userId: null) y solo aplica mientras tenga un plan activo
  // asignado (Superadmin, mientras no haya cobro real) y la suscripción no
  // esté cancelada/vencida.
  private async grantDueSubscriptions() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - GRANT_INTERVAL_DAYS);

    const due = await this.prisma.organization.findMany({
      where: {
        activeFtPlanId: { not: null },
        subscriptionStatus: { in: ['ACTIVE', 'SPONSORED'] },
        OR: [{ ftSubscriptionGrantAt: null }, { ftSubscriptionGrantAt: { lte: threshold } }],
      },
      select: { id: true, activeFtPlan: { select: { ftAmountMonthly: true } } },
    });

    if (due.length === 0) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + GRANT_INTERVAL_DAYS);

    for (const org of due) {
      if (!org.activeFtPlan) continue;
      await this.prisma.organization.update({ where: { id: org.id }, data: { ftSubscriptionGrantAt: new Date() } });
      await this.ftService.grant({
        organizationId: org.id,
        source: 'SUBSCRIPTION',
        amount: org.activeFtPlan.ftAmountMonthly,
        expiresAt,
        idempotencyKey: `subscription:${org.id}:${new Date().toISOString().slice(0, 10)}`,
      });
    }

    this.logger.log(`Lote mensual de suscripción otorgado a ${due.length} organización(es)`);
  }
}
