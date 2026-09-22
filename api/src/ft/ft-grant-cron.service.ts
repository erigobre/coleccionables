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

  // Corre a diario (no "el día 1 de cada mes") para que cada Organization
  // tenga su propio ciclo de 30 días desde su último regalo — así una cuenta
  // creada a mitad de mes no se queda sin FT hasta el día 1 del mes siguiente.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async grantDueOrganizations() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - GRANT_INTERVAL_DAYS);

    const due = await this.prisma.organization.findMany({
      where: { OR: [{ ftFreeGrantAt: null }, { ftFreeGrantAt: { lte: threshold } }] },
      select: { id: true },
    });

    if (due.length === 0) return;

    const amount = await this.ftService.getConfigValue('MONTHLY_FREE_FT', DEFAULT_MONTHLY_FREE_FT);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + GRANT_INTERVAL_DAYS);

    for (const org of due) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { ftFreeGrantAt: new Date() } });
      await this.ftService.grant({
        organizationId: org.id,
        source: 'MONTHLY_FREE',
        amount,
        expiresAt,
        idempotencyKey: `monthly-free:${org.id}:${new Date().toISOString().slice(0, 10)}`,
      });
    }

    this.logger.log(`Regalo mensual de FT otorgado a ${due.length} cuenta(s)`);
  }
}
