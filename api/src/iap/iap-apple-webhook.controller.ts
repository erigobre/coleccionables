import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { IapService } from './iap.service.js';

// Público a propósito: Apple no manda ningún header de autenticación propio,
// la autenticidad se comprueba verificando la firma JWS del body (ver
// IapService.handleAppleNotification -> AppleReceiptService). Siempre
// responde 200 tras procesar, incluso si el tipo de notificación no se
// maneja, para que Apple no reintente indefinidamente.
@Controller('iap/webhooks/apple')
export class IapAppleWebhookController {
  private readonly logger = new Logger(IapAppleWebhookController.name);

  constructor(private readonly iapService: IapService) {}

  @Post()
  @HttpCode(200)
  async handle(@Body('signedPayload') signedPayload: string) {
    if (!signedPayload) {
      return { received: true };
    }
    try {
      await this.iapService.handleAppleNotification(signedPayload);
    } catch (error) {
      this.logger.error('Error procesando notificación de Apple', error as Error);
    }
    return { received: true };
  }
}
