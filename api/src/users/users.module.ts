import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailModule } from '../email/email.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { AccountDeletionCronService } from './account-deletion-cron.service.js';

@Module({
  imports: [EmailModule, ScheduleModule.forRoot()],
  controllers: [UsersController],
  providers: [UsersService, AccountDeletionCronService],
  exports: [UsersService],
})
export class UsersModule {}
