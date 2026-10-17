import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [EmailModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
