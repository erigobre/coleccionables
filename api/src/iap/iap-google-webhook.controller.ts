import { Body, Controller, HttpCode, Headers, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { IapService } from './iap.service.js';
import { GooglePlayService } from './google-play.service.js';

interface PubSubPushBody {
  message?: { data?: string; messageId?: string };
  subscription?: string;
}

interface DeveloperNotification {
  packageName: string;
  subscriptionNotification?: { notificationType: number; purchaseToken: string; subscriptionId: string };
  oneTimeProductNotification?: { notificationType: number; purchaseToken: string; sku: string };
  testNotification?: { version: string };
}

const WEBHOOK_AUDIENCE = process.env.GOOGLE_PLAY_WEBHOOK_AUDIENCE ?? 'https://api.frikidex.com/iap/webhooks/google';

// Público a propósito: lo llama Pub/Sub, no un usuario logueado. La
// autenticidad se comprueba con el token OIDC que Pub/Sub firma en el header
// Authorization (ver GooglePlayService.verifyPushToken) — 401 si no es
// válido. Siempre responde 200 rápido tras procesar para que Pub/Sub haga ack
// (si no, reintenta con backoff).
@Controller('iap/webhooks/google')
export class IapGoogleWebhookController {
  private readonly logger = new Logger(IapGoogleWebhookController.name);

  constructor(
    private readonly iapService: IapService,
    private readonly googlePlayService: GooglePlayService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Headers('authorization') authorization: string | undefined, @Body() body: PubSubPushBody) {
    const idToken = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
    if (!idToken) {
      throw new UnauthorizedException('Falta token de autenticación');
    }
    await this.googlePlayService.verifyPushToken(idToken, WEBHOOK_AUDIENCE);

    const rawData = body.message?.data;
    if (!rawData) {
      return { received: true };
    }

    let notification: DeveloperNotification;
    try {
      notification = JSON.parse(Buffer.from(rawData, 'base64').toString('utf-8'));
    } catch (error) {
      this.logger.warn('No se pudo decodificar la notificación de Google Play');
      return { received: true };
    }

    try {
      if (notification.testNotification) {
        this.logger.log('Test notification de Google Play recibida correctamente');
      } else if (notification.subscriptionNotification) {
        const { purchaseToken, notificationType } = notification.subscriptionNotification;
        await this.iapService.handleGoogleSubscriptionNotification(notification.packageName, purchaseToken, notificationType);
      } else if (notification.oneTimeProductNotification) {
        const { purchaseToken, notificationType } = notification.oneTimeProductNotification;
        if (notificationType === 2) {
          await this.iapService.handleGoogleOneTimeRefund(notification.packageName, purchaseToken);
        }
      }
    } catch (error) {
      this.logger.error('Error procesando notificación de Google Play', error as Error);
    }

    return { received: true };
  }
}
