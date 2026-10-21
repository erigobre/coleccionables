import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { IapPlatform } from '@prisma/client';
import { NotificationTypeV2, Subtype } from '@apple/app-store-server-library';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from '../ft/ft.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AppleReceiptService } from './apple-receipt.service.js';
import { GooglePlayService } from './google-play.service.js';
import type { VerifyPackagePurchaseDto } from './dto/verify-package-purchase.dto.js';
import type { VerifySubscriptionPurchaseDto } from './dto/verify-subscription-purchase.dto.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class IapService {
  private readonly logger = new Logger(IapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ftService: FtService,
    private readonly appleReceiptService: AppleReceiptService,
    private readonly googlePlayService: GooglePlayService,
  ) {}

  async getCatalog() {
    const [packages, plans] = await Promise.all([
      this.prisma.ftPackage.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.ftPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return { packages, plans };
  }

  async verifyPackagePurchase(user: AuthenticatedUser, dto: VerifyPackagePurchaseDto) {
    const ftPackage = await this.prisma.ftPackage.findUnique({ where: { code: dto.ftPackageCode } });
    if (!ftPackage || !ftPackage.isActive) {
      throw new NotFoundException('Paquete de FrikiTokens no encontrado');
    }

    const platform: IapPlatform = dto.platform;
    let storeTransactionId: string;
    let purchaseToken: string | null = null;
    let rawPayload: unknown;

    if (platform === 'IOS') {
      if (!dto.iosTransactionJws) {
        throw new BadRequestException('Falta iosTransactionJws');
      }
      const decoded = await this.appleReceiptService.verifyTransaction(dto.iosTransactionJws);
      if (!decoded.transactionId || !decoded.productId) {
        throw new BadRequestException('Transacción de Apple incompleta');
      }
      if (decoded.productId !== ftPackage.storeProductIdIos) {
        throw new BadRequestException('El producto comprado no coincide con el paquete solicitado');
      }
      storeTransactionId = decoded.transactionId;
      rawPayload = decoded;
    } else {
      if (!dto.androidPurchaseToken || !dto.androidProductId) {
        throw new BadRequestException('Faltan androidPurchaseToken/androidProductId');
      }
      if (dto.androidProductId !== ftPackage.storeProductIdAndroid) {
        throw new BadRequestException('El producto comprado no coincide con el paquete solicitado');
      }
      const verified = await this.googlePlayService.verifyProductPurchase(dto.androidProductId, dto.androidPurchaseToken);
      storeTransactionId = verified.orderId;
      purchaseToken = dto.androidPurchaseToken;
      rawPayload = verified;
    }

    const existingPurchase = await this.prisma.ftStorePurchase.findUnique({
      where: { platform_storeTransactionId: { platform, storeTransactionId } },
    });
    if (existingPurchase) {
      return { success: true, ftAmount: ftPackage.ftAmount, alreadyProcessed: true };
    }

    const idempotencyKey = `purchase:${platform.toLowerCase()}:${storeTransactionId}`;
    const transaction = await this.ftService.grant({
      organizationId: user.organizationId,
      userId: user.id,
      source: 'PURCHASE',
      amount: ftPackage.ftAmount,
      expiresAt: null,
      idempotencyKey,
    });

    try {
      await this.prisma.ftStorePurchase.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          platform,
          storeTransactionId,
          purchaseToken,
          productId: platform === 'IOS' ? ftPackage.storeProductIdIos! : ftPackage.storeProductIdAndroid!,
          ftPackageId: ftPackage.id,
          ftTransactionId: transaction.id,
          rawPayload: rawPayload as object,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') {
        throw error;
      }
      this.logger.debug(`FtStorePurchase ya existía para ${platform}:${storeTransactionId} (carrera resuelta)`);
    }

    return { success: true, ftAmount: ftPackage.ftAmount, alreadyProcessed: false };
  }

  async verifySubscriptionPurchase(user: AuthenticatedUser, dto: VerifySubscriptionPurchaseDto) {
    const ftPlan = await this.prisma.ftPlan.findUnique({ where: { code: dto.ftPlanCode } });
    if (!ftPlan || !ftPlan.isActive) {
      throw new NotFoundException('Plan de suscripción no encontrado');
    }

    // Sin este chequeo, un dispositivo con el mismo Apple ID/cuenta de Google
    // firmado en dos cuentas de Frikidex distintas (común en pruebas, posible
    // también en producción al cambiar de cuenta en el mismo teléfono) deja
    // que StoreKit/Play entregue la MISMA transacción real a la segunda
    // cuenta, y esta función creaba sin más una segunda fila
    // `FtStoreSubscription` para esa organización reusando la misma
    // transacción — "clonando" la suscripción de otra persona (bug real
    // reportado 2026-10-21). StoreKit/Play no tienen concepto de "a qué
    // cuenta de la app pertenece esto", así que hay que bloquearlo aquí.

    const platform: IapPlatform = dto.platform;
    let originalTransactionId: string | null = null;
    let purchaseToken: string | null = null;
    let currentPeriodEndsAt: Date | null = null;

    if (platform === 'IOS') {
      if (!dto.iosTransactionJws) {
        throw new BadRequestException('Falta iosTransactionJws');
      }
      const decoded = await this.appleReceiptService.verifyTransaction(dto.iosTransactionJws);
      if (!decoded.originalTransactionId || !decoded.productId) {
        throw new BadRequestException('Transacción de Apple incompleta');
      }
      if (decoded.productId !== ftPlan.storeProductIdIos) {
        throw new BadRequestException('El producto comprado no coincide con el plan solicitado');
      }
      originalTransactionId = decoded.originalTransactionId;
      currentPeriodEndsAt = decoded.expiresDate ? new Date(decoded.expiresDate) : null;
    } else {
      if (!dto.androidPurchaseToken) {
        throw new BadRequestException('Falta androidPurchaseToken');
      }
      const verified = await this.googlePlayService.verifySubscriptionPurchase(dto.androidPurchaseToken);
      if (dto.androidProductId && verified.productId !== dto.androidProductId) {
        throw new BadRequestException('El producto comprado no coincide con el plan solicitado');
      }
      if (verified.productId !== ftPlan.storeProductIdAndroid) {
        throw new BadRequestException('El producto comprado no coincide con el plan solicitado');
      }
      if (!verified.active) {
        throw new BadRequestException('La suscripción de Android no está activa');
      }
      purchaseToken = dto.androidPurchaseToken;
      currentPeriodEndsAt = verified.expiryTime;
      if (!verified.acknowledged) {
        await this.googlePlayService.acknowledgeSubscription(dto.androidPurchaseToken);
      }
    }

    const claimedByOther = await this.prisma.ftStoreSubscription.findFirst({
      where: {
        platform,
        organizationId: { not: user.organizationId },
        ...(originalTransactionId ? { originalTransactionId } : { purchaseToken }),
      },
    });
    if (claimedByOther) {
      throw new BadRequestException(
        'Esta suscripción ya está ligada a otra cuenta. Si quieres mudarla, cancélala primero desde esa cuenta.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.ftStoreSubscription.upsert({
        where: { organizationId: user.organizationId },
        create: {
          organizationId: user.organizationId,
          platform,
          ftPlanId: ftPlan.id,
          originalTransactionId,
          purchaseToken,
          status: 'ACTIVE',
          currentPeriodEndsAt,
        },
        update: {
          platform,
          ftPlanId: ftPlan.id,
          originalTransactionId,
          purchaseToken,
          status: 'ACTIVE',
          currentPeriodEndsAt,
        },
      }),
      this.prisma.organization.update({
        where: { id: user.organizationId },
        data: { activeFtPlanId: ftPlan.id, subscriptionStatus: 'ACTIVE' },
      }),
    ]);

    const idempotencyKey = `subscription:initial:${user.organizationId}:${originalTransactionId ?? purchaseToken}`;
    await this.ftService.grant({
      organizationId: user.organizationId,
      userId: null,
      source: 'SUBSCRIPTION',
      amount: ftPlan.ftAmountMonthly,
      expiresAt: new Date(Date.now() + THIRTY_DAYS_MS),
      idempotencyKey,
    });

    return { success: true };
  }

  async handleAppleNotification(signedPayload: string): Promise<void> {
    const decoded = await this.appleReceiptService.verifyNotification(signedPayload);
    const notificationType = decoded.notificationType;
    const subtype = decoded.subtype;
    const signedTransactionInfo = decoded.data?.signedTransactionInfo;

    if (!signedTransactionInfo) {
      this.logger.debug(`Notificación de Apple sin signedTransactionInfo (${notificationType}), ignorada`);
      return;
    }

    const transaction = await this.appleReceiptService.verifyTransaction(signedTransactionInfo);
    const originalTransactionId = transaction.originalTransactionId;
    if (!originalTransactionId) {
      return;
    }

    if (notificationType === NotificationTypeV2.REFUND) {
      await this.prisma.ftStorePurchase
        .updateMany({
          where: { platform: 'IOS', storeTransactionId: transaction.transactionId ?? '' },
          data: { status: 'REFUNDED' },
        })
        .catch(() => undefined);
      return;
    }

    const subscription = await this.prisma.ftStoreSubscription.findFirst({
      where: { platform: 'IOS', originalTransactionId },
    });
    if (!subscription) {
      this.logger.debug(`Notificación de Apple para suscripción desconocida (${originalTransactionId})`);
      return;
    }

    await this.applyAppleSubscriptionNotification(subscription.organizationId, notificationType, subtype, transaction.expiresDate);
  }

  private async applyAppleSubscriptionNotification(
    organizationId: string,
    notificationType: NotificationTypeV2 | string | undefined,
    subtype: Subtype | string | undefined,
    expiresDateMs: number | undefined,
  ): Promise<void> {
    const currentPeriodEndsAt = expiresDateMs ? new Date(expiresDateMs) : undefined;
    const common = {
      lastNotificationType: String(notificationType ?? ''),
      lastNotificationAt: new Date(),
      ...(currentPeriodEndsAt ? { currentPeriodEndsAt } : {}),
    };

    switch (notificationType) {
      case NotificationTypeV2.DID_RENEW:
      case NotificationTypeV2.SUBSCRIBED:
        await this.prisma.ftStoreSubscription.update({
          where: { organizationId },
          data: { ...common, status: 'ACTIVE' },
        });
        await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'ACTIVE' } });
        break;
      case NotificationTypeV2.DID_FAIL_TO_RENEW:
        if (subtype === Subtype.GRACE_PERIOD) {
          await this.prisma.ftStoreSubscription.update({ where: { organizationId }, data: { ...common, status: 'GRACE_PERIOD' } });
          await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'PAST_DUE' } });
        }
        break;
      case NotificationTypeV2.EXPIRED:
      case NotificationTypeV2.GRACE_PERIOD_EXPIRED:
        await this.prisma.ftStoreSubscription.update({ where: { organizationId }, data: { ...common, status: 'CANCELED' } });
        await this.cancelOrganizationSubscription(organizationId);
        break;
      case NotificationTypeV2.REVOKE:
        await this.prisma.ftStoreSubscription.update({ where: { organizationId }, data: { ...common, status: 'REVOKED' } });
        await this.cancelOrganizationSubscription(organizationId);
        break;
      default:
        await this.prisma.ftStoreSubscription.update({ where: { organizationId }, data: common }).catch(() => undefined);
    }
  }

  async handleGoogleSubscriptionNotification(
    packageName: string,
    purchaseToken: string,
    notificationType: number,
  ): Promise<void> {
    let subscription = await this.prisma.ftStoreSubscription.findFirst({
      where: { platform: 'ANDROID', purchaseToken },
    });

    if (!subscription) {
      // El token rota en cada renovación: el que llega en la notificación es el
      // NUEVO; hay que seguir `linkedPurchaseToken` hasta encontrar la fila
      // guardada con el token viejo, y migrarla al nuevo (plan Fase 10 §4.2).
      const current = await this.googlePlayService.getSubscriptionByToken(purchaseToken);
      if (current.linkedPurchaseToken) {
        subscription = await this.prisma.ftStoreSubscription.findFirst({
          where: { platform: 'ANDROID', purchaseToken: current.linkedPurchaseToken },
        });
        if (subscription) {
          subscription = await this.prisma.ftStoreSubscription.update({
            where: { organizationId: subscription.organizationId },
            data: { purchaseToken },
          });
        }
      }
    }

    if (!subscription) {
      this.logger.debug(`Notificación RTDN para suscripción Android desconocida (token ${purchaseToken})`);
      return;
    }

    // SubscriptionNotificationType: 2=RENEWED, 3=CANCELED, 4=PURCHASED,
    // 5=ON_HOLD, 6=IN_GRACE_PERIOD, 12=REVOKED, 13=EXPIRED.
    const common = { lastNotificationType: String(notificationType), lastNotificationAt: new Date() };
    switch (notificationType) {
      case 2:
      case 4: {
        const verified = await this.googlePlayService.verifySubscriptionPurchase(purchaseToken);
        await this.prisma.ftStoreSubscription.update({
          where: { organizationId: subscription.organizationId },
          data: { ...common, status: 'ACTIVE', currentPeriodEndsAt: verified.expiryTime },
        });
        await this.prisma.organization.update({
          where: { id: subscription.organizationId },
          data: { subscriptionStatus: 'ACTIVE' },
        });
        break;
      }
      case 6:
        await this.prisma.ftStoreSubscription.update({
          where: { organizationId: subscription.organizationId },
          data: { ...common, status: 'GRACE_PERIOD' },
        });
        await this.prisma.organization.update({
          where: { id: subscription.organizationId },
          data: { subscriptionStatus: 'PAST_DUE' },
        });
        break;
      case 13:
        await this.prisma.ftStoreSubscription.update({
          where: { organizationId: subscription.organizationId },
          data: { ...common, status: 'CANCELED' },
        });
        await this.cancelOrganizationSubscription(subscription.organizationId);
        break;
      case 12:
        await this.prisma.ftStoreSubscription.update({
          where: { organizationId: subscription.organizationId },
          data: { ...common, status: 'REVOKED' },
        });
        await this.cancelOrganizationSubscription(subscription.organizationId);
        break;
      default:
        await this.prisma.ftStoreSubscription
          .update({ where: { organizationId: subscription.organizationId }, data: common })
          .catch(() => undefined);
    }
  }

  async handleGoogleOneTimeRefund(packageName: string, purchaseToken: string): Promise<void> {
    await this.prisma.ftStorePurchase
      .updateMany({ where: { platform: 'ANDROID', purchaseToken }, data: { status: 'REFUNDED' } })
      .catch(() => undefined);
  }

  private async cancelOrganizationSubscription(organizationId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionStatus: 'CANCELED', activeFtPlanId: null },
    });
  }
}
