import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransfersService } from './transfers.service.js';

@Injectable()
export class TransfersCronService {
  private readonly logger = new Logger(TransfersCronService.name);

  constructor(private readonly transfersService: TransfersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredTransfers() {
    const count = await this.transfersService.expireOverdueTransfers();
    if (count > 0) {
      this.logger.log(`${count} transferencia(s) expiradas y devueltas a ACTIVE`);
    }
  }
}
