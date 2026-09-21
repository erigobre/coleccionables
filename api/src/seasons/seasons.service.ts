import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSeasonDto } from './dto/create-season.dto.js';
import type { UpdateSeasonDto } from './dto/update-season.dto.js';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateSeasonDto) {
    this.assertValidRange(dto.startDate, dto.endDate);
    return this.prisma.season.create({
      data: {
        ownerId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  findAll(ownerId: string) {
    return this.prisma.season.findMany({ where: { ownerId }, orderBy: { startDate: 'desc' } });
  }

  async findOne(ownerId: string, id: string) {
    return this.assertOwnedSeason(ownerId, id);
  }

  async update(ownerId: string, id: string, dto: UpdateSeasonDto) {
    await this.assertOwnedSeason(ownerId, id);
    if (dto.startDate && dto.endDate) {
      this.assertValidRange(dto.startDate, dto.endDate);
    }
    return this.prisma.season.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    await this.assertOwnedSeason(ownerId, id);
    await this.prisma.season.delete({ where: { id } });
  }

  // Plan §5.5.8: al entrar a una temporada se listan sus objetos asignados,
  // mostrando ubicación principal/actual, estilo checklist.
  async findItemsInSeason(ownerId: string, id: string) {
    await this.assertOwnedSeason(ownerId, id);
    return this.prisma.item.findMany({
      where: { ownerId, currentSeasonId: id },
      include: { currentLocation: true, permanentLocation: true },
    });
  }

  private assertValidRange(startDate: string, endDate: string) {
    if (new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }
  }

  private async assertOwnedSeason(ownerId: string, id: string) {
    const season = await this.prisma.season.findUnique({ where: { id } });
    if (!season || season.ownerId !== ownerId) {
      throw new NotFoundException('Temporada no encontrada');
    }
    return season;
  }
}
