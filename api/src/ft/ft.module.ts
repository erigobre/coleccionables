import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FtService } from './ft.service.js';
import { FtController } from './ft.controller.js';
import { FtGrantCronService } from './ft-grant-cron.service.js';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [FtController],
  providers: [FtService, FtGrantCronService],
  exports: [FtService],
})
export class FtModule {}
