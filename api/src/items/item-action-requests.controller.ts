import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ItemActionRequestsService } from './item-action-requests.service.js';
import { CreateItemActionRequestDto } from './dto/create-item-action-request.dto.js';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemActionRequestsController {
  constructor(private readonly actionRequestsService: ItemActionRequestsService) {}

  @Post(':id/action-requests')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') itemId: string,
    @Body() dto: CreateItemActionRequestDto,
  ) {
    return this.actionRequestsService.create(user.id, itemId, dto);
  }

  @Get('action-requests/incoming')
  listIncoming(@CurrentUser() user: AuthenticatedUser) {
    return this.actionRequestsService.listIncoming(user.id);
  }

  @Get('action-requests/outgoing')
  listOutgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.actionRequestsService.listOutgoing(user.id);
  }

  @Post('action-requests/:id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.actionRequestsService.accept(user.id, requestId);
  }

  @Post('action-requests/:id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') requestId: string) {
    return this.actionRequestsService.reject(user.id, requestId);
  }
}
