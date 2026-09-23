import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { WaitlistController } from './waitlist.controller.js';
import { WaitlistService } from './waitlist.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
