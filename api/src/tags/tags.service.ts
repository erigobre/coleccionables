import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTagDto } from './dto/create-tag.dto.js';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { ownerId_name: { ownerId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException('Ya existe un tag con ese nombre');
    }
    return this.prisma.tag.create({
      data: { ownerId, name: dto.name, type: dto.type },
    });
  }

  findAll(ownerId: string) {
    return this.prisma.tag.findMany({ where: { ownerId }, orderBy: { name: 'asc' } });
  }

  async remove(ownerId: string, id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag || tag.ownerId !== ownerId) {
      throw new NotFoundException('Tag no encontrado');
    }
    await this.prisma.tag.delete({ where: { id } });
  }
}
