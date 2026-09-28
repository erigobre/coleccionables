import { Module } from '@nestjs/common';
import {
  CollectionShareController,
  ItemShareController,
  PublicCollectionShareController,
  PublicShareController,
} from './share.controller.js';
import { ShareService } from './share.service.js';

@Module({
  controllers: [ItemShareController, CollectionShareController, PublicShareController, PublicCollectionShareController],
  providers: [ShareService],
})
export class ShareModule {}
