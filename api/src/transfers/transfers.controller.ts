import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { TransfersService } from './transfers.service.js';
import { InitiateTransferDto } from './dto/initiate-transfer.dto.js';
import { AcceptTransferDto } from './dto/accept-transfer.dto.js';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiateTransferDto) {
    return this.transfersService.initiate(user.id, dto);
  }

  @Get('incoming')
  findIncoming(@CurrentUser() user: AuthenticatedUser) {
    return this.transfersService.findIncoming(user.id);
  }

  @Get('outgoing')
  findOutgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.transfersService.findOutgoing(user.id);
  }

  @Post(':id/accept')
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AcceptTransferDto,
  ) {
    return this.transfersService.accept(user.id, id, dto.targetCollectionId);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transfersService.reject(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.transfersService.cancel(user.id, id);
  }
}
