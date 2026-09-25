import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Un mismo token de dispositivo puede haber quedado asociado a otra cuenta
  // (logout + login de otro usuario en el mismo teléfono) — al re-registrar
  // se reasigna el dueño en vez de fallar por el @unique en `token`.
  registerToken(userId: string, token: string, platform?: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  async unregisterToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  // No debe romper al llamador si Expo falla: siempre atrapa sus propios errores.
  async sendPushToUser(userId: string, message: PushMessage) {
    try {
      const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
      if (tokens.length === 0) return;

      const batches: (typeof tokens)[] = [];
      for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
        batches.push(tokens.slice(i, i + EXPO_BATCH_SIZE));
      }

      for (const batch of batches) {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(
            batch.map((t) => ({
              to: t.token,
              title: message.title,
              body: message.body,
              data: message.data,
            })),
          ),
        });

        const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
        const tickets = json.data ?? [];
        for (let i = 0; i < tickets.length; i++) {
          if (tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered') {
            await this.prisma.pushToken.delete({ where: { token: batch[i].token } }).catch(() => {});
          }
        }
      }
    } catch (err) {
      this.logger.error(`Fallo al enviar push a usuario ${userId}`, err instanceof Error ? err.stack : err);
    }
  }
}
