import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CollectionSeasonAssignmentsService } from './collection-season-assignments.service.js';
import { computeCurrentOrNextOccurrence, daysUntil } from './season-occurrence.util.js';

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

@Injectable()
export class SeasonReminderCronService {
  private readonly logger = new Logger(SeasonReminderCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly assignments: CollectionSeasonAssignmentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleSeasonReminders() {
    const now = new Date();
    let sent = 0;

    const seasons = await this.prisma.season.findMany({
      where: { reminderDaysBefore: { not: null } },
      include: {
        assignments: {
          include: {
            collection: { include: { members: true } },
          },
        },
      },
    });

    for (const season of seasons) {
      const occurrence = computeCurrentOrNextOccurrence(season, now);
      if (!occurrence) continue;

      const daysToStart = daysUntil(occurrence.start, now);
      const daysToEnd = daysUntil(occurrence.end, now);

      for (const assignment of season.assignments) {
        const memberIds = [assignment.collection.ownerId, ...assignment.collection.members.map((m) => m.userId)];

        const alreadySentStartToday = assignment.startReminderSentFor && sameDay(assignment.startReminderSentFor, now);
        if (!alreadySentStartToday && (daysToStart === season.reminderDaysBefore || daysToStart === 0)) {
          const pending = await this.assignments.getChecklist(
            assignment.collection.ownerId,
            assignment.collectionId,
            assignment.id,
            'start',
          );
          const pendingCount = pending.reduce((sum, g) => sum + g.items.length, 0);
          if (pendingCount > 0) {
            const body =
              daysToStart === 0
                ? `"${season.name}" empieza hoy — mueve los objetos de "${assignment.collection.name}" a su ubicación temporal.`
                : `En ${daysToStart} día${daysToStart === 1 ? '' : 's'} "${season.name}" necesita que cambies la ubicación de "${assignment.collection.name}".`;
            await this.notifyAll(memberIds, { title: 'Temporada por comenzar', body, data: { type: 'season_start', seasonId: season.id, collectionId: assignment.collectionId } });
            await this.prisma.collectionSeasonAssignment.update({
              where: { id: assignment.id },
              data: { startReminderSentFor: now },
            });
            sent++;
          }
        }

        const alreadySentEndToday = assignment.endReminderSentFor && sameDay(assignment.endReminderSentFor, now);
        if (!alreadySentEndToday && (daysToEnd === season.reminderDaysBefore || daysToEnd === 0)) {
          const pending = await this.assignments.getChecklist(
            assignment.collection.ownerId,
            assignment.collectionId,
            assignment.id,
            'end',
          );
          const pendingCount = pending.reduce((sum, g) => sum + g.items.length, 0);
          if (pendingCount > 0) {
            const body =
              daysToEnd === 0
                ? `"${season.name}" termina hoy — regresa los objetos de "${assignment.collection.name}" a su ubicación principal.`
                : `En ${daysToEnd} día${daysToEnd === 1 ? '' : 's'} termina "${season.name}" — no olvides regresar los objetos de "${assignment.collection.name}".`;
            await this.notifyAll(memberIds, { title: 'Temporada por terminar', body, data: { type: 'season_end', seasonId: season.id, collectionId: assignment.collectionId } });
            await this.prisma.collectionSeasonAssignment.update({
              where: { id: assignment.id },
              data: { endReminderSentFor: now },
            });
            sent++;
          }
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`Recordatorios de temporada enviados: ${sent}`);
    }
  }

  private async notifyAll(userIds: string[], message: { title: string; body: string; data?: Record<string, unknown> }) {
    await Promise.all(userIds.map((userId) => this.notifications.sendPushToUser(userId, message)));
  }
}
