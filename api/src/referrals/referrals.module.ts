import { Module } from '@nestjs/common';
import { FtModule } from '../ft/ft.module.js';
import { ReferralsService } from './referrals.service.js';
import { ReferralsController } from './referrals.controller.js';

@Module({
  imports: [FtModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
