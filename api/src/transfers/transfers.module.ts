import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CollectionsModule } from '../collections/collections.module.js';
import { TransfersController } from './transfers.controller.js';
import { TransfersService } from './transfers.service.js';
import { TransfersCronService } from './transfers-cron.service.js';

@Module({
  imports: [ScheduleModule.forRoot(), CollectionsModule],
  controllers: [TransfersController],
  providers: [TransfersService, TransfersCronService],
  exports: [TransfersService],
})
export class TransfersModule {}
