import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ItemsModule } from './items.module.js';
import { TransfersModule } from '../transfers/transfers.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ItemActionRequestsController } from './item-action-requests.controller.js';
import { ItemActionRequestsService } from './item-action-requests.service.js';
import { ItemActionRequestsCronService } from './item-action-requests-cron.service.js';

// Módulo aparte (no dentro de ItemsModule) por el mismo motivo que
// CollectionMembersModule: depende de TransfersModule, y meterlo dentro de
// ItemsModule complicaría el grafo de módulos sin necesidad.
@Module({
  imports: [ItemsModule, TransfersModule, NotificationsModule, ScheduleModule.forRoot()],
  controllers: [ItemActionRequestsController],
  providers: [ItemActionRequestsService, ItemActionRequestsCronService],
})
export class ItemActionRequestsModule {}
