import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { SeasonsService } from './seasons.service.js';
import { CreateSeasonDto } from './dto/create-season.dto.js';
import { UpdateSeasonDto } from './dto/update-season.dto.js';

@Controller('seasons')
@UseGuards(JwtAuthGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSeasonDto) {
    return this.seasonsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.seasonsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.seasonsService.findOne(user.id, id);
  }

  @Get(':id/items')
  findItemsInSeason(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.seasonsService.findItemsInSeason(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSeasonDto,
  ) {
    return this.seasonsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.seasonsService.remove(user.id, id);
  }
}
