import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AdminService } from './admin.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { ResolveModerationFlagDto } from './dto/resolve-moderation-flag.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findUsers(@Query('search') search?: string) {
    return this.adminService.findUsers(search);
  }

  @Get('organizations')
  findOrganizations() {
    return this.adminService.findOrganizations();
  }

  @Patch('organizations/:id/sponsor')
  sponsor(@Param('id') id: string) {
    return this.adminService.setSponsored(id, true);
  }

  @Patch('organizations/:id/unsponsor')
  unsponsor(@Param('id') id: string) {
    return this.adminService.setSponsored(id, false);
  }

  @Post('organizations/:id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.adminService.addPayment(id, dto);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // Cola de "reportes" de moderación de IA (contenido no apto / no
  // coleccionable) — plan confirmado con el owner 2026-09-22.
  @Get('moderation-flags')
  findModerationFlags(@Query('reviewed') reviewed?: string) {
    return this.adminService.findModerationFlags(
      reviewed === undefined ? undefined : reviewed === 'true',
    );
  }

  @Patch('moderation-flags/:id/resolve')
  resolveModerationFlag(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveModerationFlagDto,
  ) {
    return this.adminService.resolveModerationFlag(id, admin.id, dto);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.setUserStatus(id, 'SUSPENDED');
  }

  @Patch('users/:id/reactivate')
  reactivateUser(@Param('id') id: string) {
    return this.adminService.setUserStatus(id, 'ACTIVE');
  }
}
