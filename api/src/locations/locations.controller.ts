import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(user.id, dto);
  }

  @Get()
  findTree(@CurrentUser() user: AuthenticatedUser) {
    return this.locationsService.findTree(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.locationsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.locationsService.remove(user.id, id);
  }

  @Get(':id/qr')
  getQr(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.locationsService.getQrImage(user.id, id);
  }

  @Get('scan/:token')
  scan(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string) {
    return this.locationsService.resolveByToken(token, user.id);
  }
}
