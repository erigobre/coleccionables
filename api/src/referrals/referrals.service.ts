import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FtService } from '../ft/ft.service.js';

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusión al compartir
const REFERRAL_LOT_DAYS = 30;
const REFERRAL_WINDOW_DAYS = 30; // ventana de "este mes" para el tope de invitaciones

const INVITEE_FT_FALLBACK = 50;
const INVITER_FT_FALLBACK = 30;
const MONTHLY_LIMIT_FALLBACK = 3;
const LIFETIME_LIMIT_FALLBACK = 20;

function generateCandidateCode(): string {
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }
  return code;
}

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

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
    const [user, code, featureEnabled, limit, lifetimeLimit] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.ensureReferralCode(userId),
      this.isFeatureEnabled(),
      this.ftService.getConfigValue('REFERRAL_MONTHLY_LIMIT', MONTHLY_LIMIT_FALLBACK),
      this.ftService.getConfigValue('REFERRAL_LIFETIME_LIMIT', LIFETIME_LIMIT_FALLBACK),
    ]);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - REFERRAL_WINDOW_DAYS);
    const [successfulThisMonth, successfulLifetime] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId, referredAt: { gte: windowStart } } }),
      this.prisma.user.count({ where: { referredById: userId } }),
    ]);

    // Suspendido (ver maybeFlagSuspiciousInviter) o al tope de por vida: se
    // trata igual — se oculta "Invitar amigos" en la app.
    const canInvite = featureEnabled && !user.referralSuspended && successfulLifetime < lifetimeLimit;

    return {
      code,
      featureEnabled,
      limit,
      lifetimeLimit,
      successfulThisMonth,
      successfulLifetime,
      canInvite,
      alreadyReferred: user.referredById !== null,
    };
  }

  // Antifraude: si este mes ya se agotó todo el tope de invitaciones del
  // inviter Y todas esas invitaciones se registraron desde la misma IP, es la
  // firma de una granja de cuentas canjeando el mismo código una y otra vez —
  // se marca sospechoso de forma permanente (deja de cobrar bono de inviter y
  // se oculta la función, igual que si hubiera llegado al tope de por vida).
  // No revierte bonos ya pagados.
  async maybeFlagSuspiciousInviter(inviterId: string) {
    try {
      const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });
      if (!inviter || inviter.referralSuspended) return;

      const monthlyLimit = await this.ftService.getConfigValue('REFERRAL_MONTHLY_LIMIT', MONTHLY_LIMIT_FALLBACK);
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - REFERRAL_WINDOW_DAYS);
      const thisMonthInvitees = await this.prisma.user.findMany({
        where: { referredById: inviterId, referredAt: { gte: windowStart } },
        select: { registrationIp: true },
      });
      if (thisMonthInvitees.length < monthlyLimit) return;

      const ips = new Set(thisMonthInvitees.map((invitee) => invitee.registrationIp));
      const allSameKnownIp = ips.size === 1 && thisMonthInvitees[0].registrationIp !== null;
      if (allSameKnownIp) {
        await this.prisma.user.update({ where: { id: inviterId }, data: { referralSuspended: true } });
      }
    } catch (error) {
      this.logger.warn(`No se pudo evaluar antifraude de referidos para ${inviterId}`, error as Error);
    }
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

    // El bono ya no se otorga aquí: se exige que el invitado muestre
    // actividad mínima primero (ver ReferralBonusCronService), para que
    // registrarse y canjear un código no sea, por sí solo, suficiente para
    // cobrarlo.
    await this.maybeFlagSuspiciousInviter(inviter.id);

    return { inviterName: inviter.name };
  }

  // Punto único de otorgamiento de bonos: lo llama solo ReferralBonusCronService,
  // una vez que el invitado ya mostró actividad mínima. Si el feature está
  // apagado no otorga el bono especial (el invitado ya recibió el bono normal
  // de registro por otro camino). El bono del inviter además respeta el tope
  // mensual, el tope de por vida y la bandera de suspensión por antifraude
  // (ver maybeFlagSuspiciousInviter) — el del invitado no depende de nada de
  // eso, porque es un bono de un solo uso por cuenta.
  async grantReferralBonuses(params: {
    inviteeId: string;
    inviteeOrganizationId: string;
    inviterId: string;
    inviterOrganizationId: string;
  }) {
    const { inviteeId, inviteeOrganizationId, inviterId, inviterOrganizationId } = params;
    if (!(await this.isFeatureEnabled())) return;

    const [inviter, inviteeFt, inviterFt, monthlyLimit, lifetimeLimit] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: inviterId } }),
      this.ftService.getConfigValue('REFERRAL_INVITEE_FT', INVITEE_FT_FALLBACK),
      this.ftService.getConfigValue('REFERRAL_INVITER_FT', INVITER_FT_FALLBACK),
      this.ftService.getConfigValue('REFERRAL_MONTHLY_LIMIT', MONTHLY_LIMIT_FALLBACK),
      this.ftService.getConfigValue('REFERRAL_LIFETIME_LIMIT', LIFETIME_LIMIT_FALLBACK),
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
    const [successfulThisMonth, successfulLifetime] = await Promise.all([
      this.prisma.user.count({ where: { referredById: inviterId, referredAt: { gte: windowStart } } }),
      this.prisma.user.count({ where: { referredById: inviterId } }),
    ]);

    const inviterEligible = !inviter.referralSuspended && successfulThisMonth <= monthlyLimit && successfulLifetime <= lifetimeLimit;
    if (inviterEligible) {
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
