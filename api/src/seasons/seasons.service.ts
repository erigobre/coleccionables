import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Season, SeasonRecurrence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateSeasonDto } from './dto/create-season.dto.js';
import type { UpdateSeasonDto } from './dto/update-season.dto.js';

type AnchorFields = Pick<
  CreateSeasonDto,
  | 'startDate'
  | 'endDate'
  | 'startWeekday'
  | 'endWeekday'
  | 'startDayOfMonth'
  | 'endDayOfMonth'
  | 'startMonth'
  | 'startDay'
  | 'endMonth'
  | 'endDay'
>;

// Por tipo de recurrencia, qué campos ancla son obligatorios y cuáles deben
// quedar en null (nunca se guarda un año para las recurrentes).
const ANCHOR_FIELDS_BY_RECURRENCE: Record<SeasonRecurrence, (keyof AnchorFields)[]> = {
  ONE_TIME: ['startDate', 'endDate'],
  WEEKLY: ['startWeekday', 'endWeekday'],
  MONTHLY: ['startDayOfMonth', 'endDayOfMonth'],
  YEARLY: ['startMonth', 'startDay', 'endMonth', 'endDay'],
};

const ALL_ANCHOR_FIELDS: (keyof AnchorFields)[] = [
  'startDate',
  'endDate',
  'startWeekday',
  'endWeekday',
  'startDayOfMonth',
  'endDayOfMonth',
  'startMonth',
  'startDay',
  'endMonth',
  'endDay',
];

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, dto: CreateSeasonDto) {
    const data = this.buildAnchorData(dto.recurrence, dto);
    return this.prisma.season.create({
      data: {
        ownerId,
        name: dto.name,
        recurrence: dto.recurrence,
        reminderDaysBefore: dto.reminderDaysBefore ?? null,
        ...data,
      },
    });
  }

  findAll(ownerId: string) {
    return this.prisma.season.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(ownerId: string, id: string) {
    return this.assertOwnedSeason(ownerId, id);
  }

  async update(ownerId: string, id: string, dto: UpdateSeasonDto) {
    const season = await this.assertOwnedSeason(ownerId, id);
    const recurrence = dto.recurrence ?? season.recurrence;
    // Si cambia el tipo de recurrencia (o se edita una recurrente), se exige el
    // set completo de anclas para ese tipo — no tiene sentido mezclar anclas
    // de un tipo viejo con el nuevo.
    const data = this.buildAnchorData(recurrence, dto, recurrence !== season.recurrence);

    return this.prisma.season.update({
      where: { id },
      data: {
        name: dto.name,
        recurrence,
        reminderDaysBefore: dto.reminderDaysBefore !== undefined ? dto.reminderDaysBefore : undefined,
        ...data,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    await this.assertOwnedSeason(ownerId, id);
    await this.prisma.season.delete({ where: { id } });
  }

  // Arma el objeto de anclas a guardar: las del tipo elegido (exigidas), y
  // explícitamente null el resto, para no dejar basura de un cambio de tipo
  // previo (ej. pasar de YEARLY a WEEKLY debe limpiar startMonth/startDay/etc).
  private buildAnchorData(recurrence: SeasonRecurrence, dto: Partial<AnchorFields>, requireAll = true) {
    const required = ANCHOR_FIELDS_BY_RECURRENCE[recurrence];
    const data: Record<string, unknown> = {};

    for (const field of ALL_ANCHOR_FIELDS) {
      if (!required.includes(field)) {
        data[field] = null;
        continue;
      }
      const value = dto[field];
      if (value === undefined || value === null) {
        if (requireAll) {
          throw new BadRequestException(`Falta el campo "${field}" para la recurrencia elegida`);
        }
        continue;
      }
      data[field] = field === 'startDate' || field === 'endDate' ? new Date(value as string) : value;
    }

    if (recurrence === 'ONE_TIME' && data.startDate && data.endDate) {
      if ((data.startDate as Date) >= (data.endDate as Date)) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    return data;
  }

  private async assertOwnedSeason(ownerId: string, id: string): Promise<Season> {
    const season = await this.prisma.season.findUnique({ where: { id } });
    if (!season || season.ownerId !== ownerId) {
      throw new NotFoundException('Temporada no encontrada');
    }
    return season;
  }
}
