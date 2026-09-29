import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReferralsService } from './referrals.service.js';

const MIN_ITEMS_FOR_REFERRAL_BONUS = 1;

@Injectable()
export class ReferralBonusCronService {
  private readonly logger = new Logger(ReferralBonusCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly referralsService: ReferralsService,
  ) {}

  // El bono de referido ya no se paga al canjear el código (ver
  // ReferralsService.redeemCode / AuthService.register): se exige que el
  // invitado agregue al menos un objeto a su colección antes de pagarlo, para
  // que crear una cuenta y aceptar una invitación no sea, por sí solo,
  // suficiente para cobrarlo — la fricción mínima que hace menos rentable el
  // autoreferido con cuentas de un solo uso.
  @Cron(CronExpression.EVERY_HOUR)
  async payDueReferralBonuses() {
    const pending = await this.prisma.user.findMany({
      where: { referredById: { not: null }, referralBonusPaid: false },
      select: { id: true, organizationId: true, referredById: true },
    });
    if (pending.length === 0) return;

    let paid = 0;
    for (const invitee of pending) {
      const itemCount = await this.prisma.item.count({ where: { ownerId: invitee.id } });
      if (itemCount < MIN_ITEMS_FOR_REFERRAL_BONUS) continue;

      const inviter = await this.prisma.user.findUnique({ where: { id: invitee.referredById as string } });
      if (!inviter) {
        // El inviter ya no existe (cuenta borrada); no hay a quién pagarle,
        // pero sí hay que dejar de revisar a este invitado cada hora.
        await this.prisma.user.update({ where: { id: invitee.id }, data: { referralBonusPaid: true } });
        continue;
      }

      await this.referralsService.grantReferralBonuses({
        inviteeId: invitee.id,
        inviteeOrganizationId: invitee.organizationId,
        inviterId: inviter.id,
        inviterOrganizationId: inviter.organizationId,
      });
      await this.prisma.user.update({ where: { id: invitee.id }, data: { referralBonusPaid: true } });
      paid += 1;
    }

    if (paid > 0) {
      this.logger.log(`Bono de referido pagado a ${paid} usuario(s) tras mostrar actividad`);
    }
  }
}
