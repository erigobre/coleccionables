import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CollectionMembersService } from './collection-members.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { RemoveMemberDto } from './dto/remove-member.dto.js';

@Controller('collections/:id')
@UseGuards(JwtAuthGuard)
export class CollectionMembersController {
  constructor(private readonly membersService: CollectionMembersService) {}

  @Post('invite')
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') collectionId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.inviteMember(user.id, collectionId, dto);
  }

  @Post('invite/accept')
  acceptInvite(@CurrentUser() user: AuthenticatedUser, @Param('id') collectionId: string) {
    return this.membersService.acceptInvite(user.id, collectionId);
  }

  @Post('invite/reject')
  rejectInvite(@CurrentUser() user: AuthenticatedUser, @Param('id') collectionId: string) {
    return this.membersService.rejectInvite(user.id, collectionId);
  }

  @Get('members')
  listMembers(@CurrentUser() user: AuthenticatedUser, @Param('id') collectionId: string) {
    return this.membersService.listMembers(user.id, collectionId);
  }

  @Get('members/:userId/removal-preview')
  getRemovalPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') collectionId: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.membersService.getRemovalPreview(user.id, collectionId, memberUserId);
  }

  @Post('members/:userId/remove')
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') collectionId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.membersService.removeMember(user.id, collectionId, memberUserId, dto);
  }
}

// Controlador separado (path literal, sin :id) para no competir con las rutas
// de arriba — alimenta la pantalla de "Notificaciones" (invitaciones a
// colecciones pendientes de aceptar/rechazar que me mandaron a mí).
@Controller('collections/invites')
@UseGuards(JwtAuthGuard)
export class CollectionInvitesController {
  constructor(private readonly membersService: CollectionMembersService) {}

  @Get('mine')
  listMyInvites(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.listMyInvites(user.id);
  }
}
