import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from '../ft/ft.service.js';

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusión al compartir
const REFERRAL_LOT_DAYS = 30;
const REFERRAL_WINDOW_DAYS = 30; // ventana de "este mes" para el tope de invitaciones

const INVITEE_FT_FALLBACK = 50;
const INVITER_FT_FALLBACK = 30;
const MONTHLY_LIMIT_FALLBACK = 3;

function generateCandidateCode(): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }
  return code;
}

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ftService: FtService,
  ) {}

  private async isFeatureEnabled() {
    return (await this.ftService.getConfigValue('REFERRAL_FEATURE_ENABLED', 1)) !== 0;
  }

  // referralCode es nullable (mismo criterio que username): se genera la
  // primera vez que se pide, en vez de forzar un backfill masivo al migrar.
  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.referralCode) return user.referralCode;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateCandidateCode();
      const taken = await this.prisma.user.findUnique({ where: { referralCode: candidate } });
      if (!taken) {
        const updated = await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: candidate },
        });
        return updated.referralCode as string;
      }
    }
    throw new Error('No se pudo generar un código de invitación único');
  }

  async getMyReferralInfo(userId: string) {
    const [user, code, featureEnabled, limit] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.ensureReferralCode(userId),
      this.isFeatureEnabled(),
      this.ftService.getConfigValue('REFERRAL_MONTHLY_LIMIT', MONTHLY_LIMIT_FALLBACK),
    ]);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - REFERRAL_WINDOW_DAYS);
    const successfulThisMonth = await this.prisma.user.count({
      where: { referredById: userId, referredAt: { gte: windowStart } },
    });

    return {
      code,
      featureEnabled,
      limit,
      successfulThisMonth,
      alreadyReferred: user.referredById !== null,
    };
  }

  async redeemCode(userId: string, rawCode: string) {
    if (!(await this.isFeatureEnabled())) {
      throw new BadRequestException('El programa de invitaciones no está disponible por ahora');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.referredById) {
      throw new ConflictException('Ya canjeaste un código de invitación antes');
    }

    const code = rawCode.trim().toUpperCase();
    const inviter = await this.prisma.user.findUnique({ where: { referralCode: code } });
    if (!inviter || inviter.id === userId) {
      throw new BadRequestException('Ese código de invitación no es válido');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { referredById: inviter.id, referredAt: new Date(), referralSource: 'FRIEND_CODE' },
    });

    await this.grantReferralBonuses({
      inviteeId: userId,
      inviteeOrganizationId: user.organizationId,
      inviterId: inviter.id,
      inviterOrganizationId: inviter.organizationId,
    });

    return { inviterName: inviter.name };
  }

  // Punto único de otorgamiento de bonos, reusado tanto por `redeemCode` como
  // por el backfill de invitación-por-transferencia en AuthService.register.
  // Si el feature está apagado no otorga el bono especial (el invitado ya
  // recibió el bono normal de registro por otro camino).
  async grantReferralBonuses(params: {
    inviteeId: string;
    inviteeOrganizationId: string;
    inviterId: string;
    inviterOrganizationId: string;
  }) {
    const { inviteeId, inviteeOrganizationId, inviterId, inviterOrganizationId } = params;
    if (!(await this.isFeatureEnabled())) return;

    const [inviteeFt, inviterFt, limit] = await Promise.all([
      this.ftService.getConfigValue('REFERRAL_INVITEE_FT', INVITEE_FT_FALLBACK),
      this.ftService.getConfigValue('REFERRAL_INVITER_FT', INVITER_FT_FALLBACK),
      this.ftService.getConfigValue('REFERRAL_MONTHLY_LIMIT', MONTHLY_LIMIT_FALLBACK),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFERRAL_LOT_DAYS);

    await this.ftService.grant({
      organizationId: inviteeOrganizationId,
      userId: inviteeId,
      source: 'REFERRAL',
      amount: inviteeFt,
      expiresAt,
      idempotencyKey: `referral-invitee:${inviteeId}`,
    });

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - REFERRAL_WINDOW_DAYS);
    const successfulThisMonth = await this.prisma.user.count({
      where: { referredById: inviterId, referredAt: { gte: windowStart } },
    });

    if (successfulThisMonth <= limit) {
      await this.ftService.grant({
        organizationId: inviterOrganizationId,
        userId: inviterId,
        source: 'REFERRAL',
        amount: inviterFt,
        expiresAt,
        idempotencyKey: `referral-inviter:${inviterId}:${inviteeId}`,
      });
    }
  }
}
