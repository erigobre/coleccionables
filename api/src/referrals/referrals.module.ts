import { Module } from '@nestjs/common';
import { FtModule } from '../ft/ft.module.js';
import { ReferralsService } from './referrals.service.js';
import { ReferralsController } from './referrals.controller.js';
import { ReferralBonusCronService } from './referral-bonus-cron.service.js';

@Module({
  imports: [FtModule],
  controllers: [ReferralsController],
  providers: [ReferralsService, ReferralBonusCronService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
