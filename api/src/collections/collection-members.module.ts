import { Module } from '@nestjs/common';
import { CollectionsModule } from './collections.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { TransfersModule } from '../transfers/transfers.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { FtModule } from '../ft/ft.module.js';
import { CollectionMembersController } from './collection-members.controller.js';
import { CollectionMembersService } from './collection-members.service.js';

// Módulo aparte (no dentro de CollectionsModule) porque depende de
// TransfersModule (modo TRANSFER de expulsión) y TransfersModule ya depende de
// CollectionsModule (TransfersService.accept usa assertCanAddItems) — meterlo
// en CollectionsModule crearía un ciclo de módulos.
@Module({
  imports: [CollectionsModule, LocationsModule, TransfersModule, NotificationsModule, FtModule],
  controllers: [CollectionMembersController],
  providers: [CollectionMembersService],
})
export class CollectionMembersModule {}
