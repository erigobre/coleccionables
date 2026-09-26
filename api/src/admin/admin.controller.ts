import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AdminService } from './admin.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { ResolveModerationFlagDto } from './dto/resolve-moderation-flag.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { CreateFtPackageDto, UpdateFtPackageDto } from './dto/upsert-ft-package.dto.js';
import { CreateFtPlanDto, UpdateFtPlanDto } from './dto/upsert-ft-plan.dto.js';
import { GrantFtDto } from './dto/grant-ft.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findUsers(@Query('search') search?: string) {
    return this.adminService.findUsers(search);
  }

  @Get('users/:id')
  findUserDetail(@Param('id') id: string) {
    return this.adminService.findUserDetail(id);
  }

  @Patch('users/:id')
  updateUser(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(admin, id, dto);
  }

  @Get('organizations')
  findOrganizations() {
    return this.adminService.findOrganizations();
  }

  @Patch('organizations/:id')
  updateOrganization(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.adminService.updateOrganization(admin, id, dto);
  }

  @Patch('organizations/:id/sponsor')
  sponsor(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.setSponsored(admin, id, true);
  }

  @Patch('organizations/:id/unsponsor')
  unsponsor(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.setSponsored(admin, id, false);
  }

  @Post('organizations/:id/payments')
  addPayment(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreatePaymentDto) {
    return this.adminService.addPayment(admin, id, dto);
  }

  @Get('payments')
  findPayments() {
    return this.adminService.findPayments();
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/timeseries')
  getStatsTimeseries(@Query('months') months?: string) {
    return this.adminService.getStatsTimeseries(months ? Number(months) : undefined);
  }

  @Get('audit-logs')
  findAuditLogs() {
    return this.adminService.findAuditLogs();
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
    return this.adminService.resolveModerationFlag(admin, id, dto);
  }

  @Patch('users/:id/suspend')
  suspendUser(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.setUserStatus(admin, id, 'SUSPENDED');
  }

  @Patch('users/:id/reactivate')
  reactivateUser(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.setUserStatus(admin, id, 'ACTIVE');
  }

  // Catálogo de paquetes/planes de FT (mismo modelo que /ft/packages y
  // /ft/plans, editable aquí sin deploy) — pedido 2026-09-25.
  @Get('ft-packages')
  findFtPackages() {
    return this.adminService.findFtPackages();
  }

  @Post('ft-packages')
  createFtPackage(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateFtPackageDto) {
    return this.adminService.createFtPackage(admin, dto);
  }

  @Patch('ft-packages/:id')
  updateFtPackage(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFtPackageDto) {
    return this.adminService.updateFtPackage(admin, id, dto);
  }

  @Get('ft-plans')
  findFtPlans() {
    return this.adminService.findFtPlans();
  }

  @Post('ft-plans')
  createFtPlan(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreateFtPlanDto) {
    return this.adminService.createFtPlan(admin, dto);
  }

  @Patch('ft-plans/:id')
  updateFtPlan(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFtPlanDto) {
    return this.adminService.updateFtPlan(admin, id, dto);
  }

  // Regalo manual de FT a una organización, sin pago (queda como sponsor).
  @Post('organizations/:id/grant-ft')
  grantFt(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: GrantFtDto) {
    return this.adminService.grantFt(admin, id, dto);
  }
}
