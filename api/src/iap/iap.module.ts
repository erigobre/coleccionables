import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FtModule } from '../ft/ft.module.js';
import { IapController } from './iap.controller.js';
import { IapAppleWebhookController } from './iap-apple-webhook.controller.js';
import { IapGoogleWebhookController } from './iap-google-webhook.controller.js';
import { IapService } from './iap.service.js';
import { AppleReceiptService } from './apple-receipt.service.js';
import { GooglePlayService } from './google-play.service.js';

@Module({
  imports: [PrismaModule, FtModule],
  controllers: [IapController, IapAppleWebhookController, IapGoogleWebhookController],
  providers: [IapService, AppleReceiptService, GooglePlayService],
})
export class IapModule {}
