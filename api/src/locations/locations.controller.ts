import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { ShareLocationDto } from './dto/share-location.dto.js';

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

  // Antes de `:id` a propósito: si no, Nest lo trataría como un id de ubicación.
  @Get('share-candidates')
  listShareCandidates(@CurrentUser() user: AuthenticatedUser) {
    return this.locationsService.listShareCandidates(user.id);
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

  // Compartir manual de ubicación (caso "vivimos juntos"): solo el dueño, y
  // solo hacia alguien con quien ya comparte al menos una colección.
  @Get(':id/share')
  listShares(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.locationsService.listLocationShares(user.id, id);
  }

  @Post(':id/share')
  share(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ShareLocationDto,
  ) {
    return this.locationsService.shareLocation(user.id, id, dto.userId, dto.role);
  }

  @Delete(':id/share/:userId')
  revokeShare(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.locationsService.revokeLocationShare(user.id, id, targetUserId);
  }
}
