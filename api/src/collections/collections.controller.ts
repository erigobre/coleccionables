import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CollectionsService } from './collections.service.js';
import { CreateCollectionDto } from './dto/create-collection.dto.js';
import { UpdateCollectionDto } from './dto/update-collection.dto.js';
import { RemoveCollectionDto } from './dto/remove-collection.dto.js';

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(user.id, dto);
  }

  @Get()
  findAllActive(@CurrentUser() user: AuthenticatedUser) {
    return this.collectionsService.findAllActive(user.id);
  }

  @Get('manage')
  findAllForManagement(@CurrentUser() user: AuthenticatedUser) {
    return this.collectionsService.findAllForManagement(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collectionsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(user.id, id, dto);
  }

  @Patch(':id/suspend')
  suspend(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collectionsService.setSuspended(user.id, id, true);
  }

  @Patch(':id/activate')
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collectionsService.setSuspended(user.id, id, false);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RemoveCollectionDto,
  ) {
    return this.collectionsService.remove(user.id, id, dto);
  }
}
