import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CollectionsModule } from '../collections/collections.module.js';
import { LocationsModule } from '../locations/locations.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AiModule } from '../ai/ai.module.js';
import { FtModule } from '../ft/ft.module.js';
import { ItemsService } from './items.service.js';
import { ItemsController } from './items.controller.js';

@Module({
  imports: [PrismaModule, CollectionsModule, LocationsModule, StorageModule, AiModule, FtModule],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
