import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CollectionsModule } from './collections.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { TransfersModule } from '../transfers/transfers.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { FtModule } from '../ft/ft.module.js';
import { CollectionMembersController, CollectionInvitesController } from './collection-members.controller.js';
import { CollectionMembersService } from './collection-members.service.js';
import { CollectionInvitesCronService } from './collection-invites-cron.service.js';

// Módulo aparte (no dentro de CollectionsModule) porque depende de
// TransfersModule (modo TRANSFER de expulsión) y TransfersModule ya depende de
// CollectionsModule (TransfersService.accept usa assertCanAddItems) — meterlo
// en CollectionsModule crearía un ciclo de módulos.
@Module({
  imports: [CollectionsModule, LocationsModule, TransfersModule, NotificationsModule, FtModule, ScheduleModule.forRoot()],
  controllers: [CollectionMembersController, CollectionInvitesController],
  providers: [CollectionMembersService, CollectionInvitesCronService],
})
export class CollectionMembersModule {}
