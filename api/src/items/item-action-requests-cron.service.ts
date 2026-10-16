import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ItemActionRequestsCronService {
  private readonly logger = new Logger(ItemActionRequestsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireOverdueRequests() {
    const { count } = await this.prisma.itemActionRequest.updateMany({
      where: { status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });

    if (count > 0) {
      this.logger.log(`${count} solicitud(es) de autorización sobre objetos expiradas`);
    }
  }
}
