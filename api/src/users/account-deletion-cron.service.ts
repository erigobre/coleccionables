import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

const DELETION_GRACE_DAYS = 15;
const SALT_ROUNDS = 10;

@Injectable()
export class AccountDeletionCronService {
  private readonly logger = new Logger(AccountDeletionCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Decisión #8 del plan de Ajustes: anonimizar, no DELETE duro — así no hay
  // que resolver cascada por cascada qué pasa con objetos ya transferidos a
  // terceros o colecciones compartidas; esos datos siguen intactos.
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async anonymizeOverdueAccounts() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - DELETION_GRACE_DAYS);

    const due = await this.prisma.user.findMany({
      where: { status: 'PENDING_DELETION', deletionRequestedAt: { lte: threshold } },
      select: { id: true },
    });

    if (due.length === 0) return;

    for (const { id } of due) {
      const anonymousTag = randomUUID();
      const passwordHash = await bcrypt.hash(randomUUID(), SALT_ROUNDS);
      await this.prisma.user.update({
        where: { id },
        data: {
          email: `eliminado-${anonymousTag}@frikidex.invalid`,
          username: null,
          name: 'Cuenta eliminada',
          passwordHash,
          avatarUrl: null,
          // SUSPENDED (no queda ningún login real posible: el correo y la
          // contraseña ya son irrecuperables) en vez de dejarla en
          // PENDING_DELETION, para que este barrido no la vuelva a procesar.
          status: 'SUSPENDED',
        },
      });
    }

    this.logger.log(`${due.length} cuenta(s) anonimizada(s) tras 15 días sin volver a iniciar sesión`);
  }
}
