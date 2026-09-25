import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const SEASON_REMINDER_DAYS_BEFORE = 3;

@Injectable()
export class SeasonReminderCronService {
  private readonly logger = new Logger(SeasonReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleUpcomingSeasonEnds() {
    const now = new Date();
    const limit = new Date(now.getTime() + SEASON_REMINDER_DAYS_BEFORE * 86400000);

    const seasons = await this.prisma.season.findMany({
      where: { endDate: { gt: now, lte: limit }, reminderSentAt: null },
    });

    for (const season of seasons) {
      await this.notifications.sendPushToUser(season.ownerId, {
        title: 'Temporada por terminar',
        body: `"${season.name}" termina pronto — no olvides regresar tus objetos a su ubicación permanente.`,
        data: { type: 'season', seasonId: season.id },
      });
      await this.prisma.season.update({ where: { id: season.id }, data: { reminderSentAt: now } });
    }

    if (seasons.length > 0) {
      this.logger.log(`Recordatorio de temporada enviado a ${seasons.length} temporada(s)`);
    }
  }
}
