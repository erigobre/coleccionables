import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { WishlistService } from './wishlist.service.js';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto.js';
import { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto.js';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWishlistItemDto) {
    return this.wishlistService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.findAll(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWishlistItemDto,
  ) {
    return this.wishlistService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.wishlistService.remove(user.id, id);
  }
}
