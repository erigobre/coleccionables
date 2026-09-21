import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

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
}
