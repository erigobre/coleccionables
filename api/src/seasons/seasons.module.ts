import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CollectionsModule } from '../collections/collections.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { SeasonsController } from './seasons.controller.js';
import { SeasonsService } from './seasons.service.js';
import { SeasonReminderCronService } from './season-reminder-cron.service.js';
import { CollectionSeasonAssignmentsController } from './collection-season-assignments.controller.js';
import { CollectionSeasonAssignmentsService } from './collection-season-assignments.service.js';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule, CollectionsModule, LocationsModule],
  controllers: [SeasonsController, CollectionSeasonAssignmentsController],
  providers: [SeasonsService, SeasonReminderCronService, CollectionSeasonAssignmentsService],
  exports: [SeasonsService, CollectionSeasonAssignmentsService],
})
export class SeasonsModule {}
