import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

const INVITE_EXPIRY_DAYS = 7;

@Injectable()
export class OrganizationInvitesCronService {
  private readonly logger = new Logger(OrganizationInvitesCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireOverdueInvites() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - INVITE_EXPIRY_DAYS);

    const { count } = await this.prisma.organizationInvite.updateMany({
      where: { status: 'PENDING', createdAt: { lte: threshold } },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });

    if (count > 0) {
      this.logger.log(`${count} invitación(es) de familia expiradas`);
    }
  }
}
