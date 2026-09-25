import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SeasonsController } from './seasons.controller.js';
import { SeasonsService } from './seasons.service.js';
import { SeasonReminderCronService } from './season-reminder-cron.service.js';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [SeasonsController],
  providers: [SeasonsService, SeasonReminderCronService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
