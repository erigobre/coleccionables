import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { InviteMemberDto } from '../auth/dto/invite-member.dto.js';
import { OrganizationsService } from './organizations.service.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('organizations/me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getMyOrganization(user.id);
  }

  @Post('organizations/me/subscription/cancel')
  cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.cancelSubscription(user.id);
  }

  @Post('organizations/me/members')
  inviteOrCreateMember(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteMemberDto) {
    return this.organizationsService.inviteOrCreateMember(user.id, dto);
  }

  @Delete('organizations/me/members/:userId')
  removeMember(@CurrentUser() user: AuthenticatedUser, @Param('userId') memberUserId: string) {
    return this.organizationsService.removeMember(user.id, memberUserId);
  }

  @Get('organizations/me/invites')
  listMyInvites(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listMyInvites(user.id);
  }

  @Post('organizations/invite/:id/accept')
  acceptInvite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.organizationsService.acceptInvite(user.id, id);
  }

  @Post('organizations/invite/:id/reject')
  rejectInvite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.organizationsService.rejectInvite(user.id, id);
  }
}
