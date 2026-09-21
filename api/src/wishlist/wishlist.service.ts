import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWishlistItemDto } from './dto/create-wishlist-item.dto.js';
import type { UpdateWishlistItemDto } from './dto/update-wishlist-item.dto.js';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateWishlistItemDto) {
    return this.prisma.wishlistItem.create({ data: { ownerId, ...dto } });
  }

  findAll(ownerId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(ownerId: string, id: string, dto: UpdateWishlistItemDto) {
    await this.assertOwned(ownerId, id);
    return this.prisma.wishlistItem.update({ where: { id }, data: dto });
  }

  async remove(ownerId: string, id: string) {
    await this.assertOwned(ownerId, id);
    await this.prisma.wishlistItem.delete({ where: { id } });
  }

  private async assertOwned(ownerId: string, id: string) {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({ where: { id } });
    if (!wishlistItem || wishlistItem.ownerId !== ownerId) {
      throw new NotFoundException('Elemento de wishlist no encontrado');
    }
    return wishlistItem;
  }
}
