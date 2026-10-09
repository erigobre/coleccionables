import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTagDto } from './dto/create-tag.dto.js';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  // Un tag se identifica por su nombre: si ya existe (sin importar mayúsculas),
  // se devuelve ese en vez de rechazar la creación. Así "crea si no existe" nunca
  // falla con un duplicado.
  async create(ownerId: string, dto: CreateTagDto) {
    const name = dto.name.trim();
    const existing = await this.findByName(ownerId, name);
    if (existing) return existing;
    try {
      return await this.prisma.tag.create({
        data: { ownerId, name, type: dto.type },
      });
    } catch (err) {
      // Dos peticiones simultáneas con el mismo nombre: la segunda choca con el
      // índice único (P2002); en ese caso el tag ya quedó creado por la primera.
      if ((err as { code?: string }).code === 'P2002') {
        const created = await this.findByName(ownerId, name);
        if (created) return created;
      }
      throw err;
    }
  }

  // MySQL ya compara `name` sin distinguir mayúsculas (collation
  // utf8mb4_unicode_ci de la tabla `tags`), así que no hace falta (ni acepta
  // Prisma con este proveedor) el argumento `mode: 'insensitive'` de Postgres.
  private findByName(ownerId: string, name: string) {
    return this.prisma.tag.findFirst({
      where: { ownerId, name: { equals: name } },
    });
  }

  // Sin `q`, se listan los tags del usuario (uso interno/admin); con `q` se
  // busca por texto y se limita el resultado, porque un usuario con miles de
  // tags no puede recibirlos todos de un jalón cada vez que abre un formulario.
  findAll(ownerId: string, q?: string) {
    if (q && q.trim().length > 0) {
      return this.prisma.tag.findMany({
        where: { ownerId, name: { contains: q.trim() } },
        orderBy: { name: 'asc' },
        take: 20,
      });
    }
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
