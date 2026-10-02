import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EmailModule } from '../email/email.module.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationInvitesCronService } from './organization-invites-cron.service.js';

@Module({
  imports: [NotificationsModule, EmailModule, ScheduleModule.forRoot()],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationInvitesCronService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
