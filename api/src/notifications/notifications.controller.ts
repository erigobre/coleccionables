import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { NotificationsService } from './notifications.service.js';
import { RegisterPushTokenDto } from './dto/register-push-token.dto.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-tokens')
  registerToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterPushTokenDto) {
    return this.notificationsService.registerToken(user.id, dto.token, dto.platform);
  }

  @Delete('push-tokens/:token')
  unregisterToken(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string) {
    return this.notificationsService.unregisterToken(user.id, token);
  }
}
