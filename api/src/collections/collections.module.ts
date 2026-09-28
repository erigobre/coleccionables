import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module.js';
import { CollectionsController } from './collections.controller.js';
import { CollectionsService } from './collections.service.js';
import { CollectionLocationService } from './collection-location.service.js';

@Module({
  imports: [LocationsModule],
  controllers: [CollectionsController],
  providers: [CollectionsService, CollectionLocationService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
