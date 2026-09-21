import { Module } from '@nestjs/common';
import { ItemShareController, PublicShareController } from './share.controller.js';
import { ShareService } from './share.service.js';

@Module({
  controllers: [ItemShareController, PublicShareController],
  providers: [ShareService],
})
export class ShareModule {}
