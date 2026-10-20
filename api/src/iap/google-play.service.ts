import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google, androidpublisher_v3 } from 'googleapis';

const SUBSCRIPTION_ACTIVE_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
]);

export interface VerifiedAndroidProductPurchase {
  orderId: string;
  productId: string;
}

export interface VerifiedAndroidSubscriptionPurchase {
  productId: string;
  expiryTime: Date | null;
  linkedPurchaseToken: string | null;
  acknowledged: boolean;
  active: boolean;
  subscriptionState: string | null;
}

@Injectable()
export class GooglePlayService {
  private readonly logger = new Logger(GooglePlayService.name);
  private readonly packageName = process.env.ANDROID_PACKAGE_NAME ?? 'com.frikidex.app';
  private client?: androidpublisher_v3.Androidpublisher;
  private oauth2Client?: OAuth2Client;

  private getClient(): androidpublisher_v3.Androidpublisher {
    if (!this.client) {
      const rawCredentials = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
      if (!rawCredentials) {
        throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON no está configurada');
      }
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(rawCredentials),
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
      this.client = google.androidpublisher({ version: 'v3', auth });
    }
    return this.client;
  }

  private getOAuth2Client(): OAuth2Client {
    this.oauth2Client ??= new OAuth2Client();
    return this.oauth2Client;
  }

  // Confirma que la notificación RTDN de Pub/Sub viene realmente de Google
  // (Authorization: Bearer <idToken>), no de cualquiera que adivine la URL.
  async verifyPushToken(idToken: string, audience: string): Promise<void> {
    try {
      await this.getOAuth2Client().verifyIdToken({ idToken, audience });
    } catch (error) {
      this.logger.warn(`Token OIDC de Pub/Sub inválido: ${(error as Error).message}`);
      throw new UnauthorizedException('Token de notificación inválido');
    }
  }

  async verifyProductPurchase(productId: string, token: string): Promise<VerifiedAndroidProductPurchase> {
    const { data } = await this.getClient().purchases.products.get({
      packageName: this.packageName,
      productId,
      token,
    });
    if (data.purchaseState !== 0) {
      throw new Error(`Compra de producto Android no válida (purchaseState=${data.purchaseState})`);
    }
    if (!data.orderId || !data.productId) {
      throw new Error('Respuesta de Google Play incompleta (orderId/productId faltante)');
    }
    return { orderId: data.orderId, productId: data.productId };
  }

  async getSubscriptionByToken(token: string): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2> {
    const { data } = await this.getClient().purchases.subscriptionsv2.get({
      packageName: this.packageName,
      token,
    });
    return data;
  }

  async verifySubscriptionPurchase(token: string): Promise<VerifiedAndroidSubscriptionPurchase> {
    const data = await this.getSubscriptionByToken(token);
    const lineItem = data.lineItems?.[0];
    return {
      productId: lineItem?.productId ?? '',
      expiryTime: lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null,
      linkedPurchaseToken: data.linkedPurchaseToken ?? null,
      acknowledged: data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      active: SUBSCRIPTION_ACTIVE_STATES.has(data.subscriptionState ?? ''),
      subscriptionState: data.subscriptionState ?? null,
    };
  }

  // Google reembolsa automático si una suscripción no se reconoce dentro de 3
  // días (plan Fase 10 §4.2) — se llama justo tras verificar con éxito, nunca
  // desde el cliente.
  async acknowledgeSubscription(token: string): Promise<void> {
    await this.getClient().purchases.subscriptions.acknowledge({
      packageName: this.packageName,
      token,
    });
  }
}
