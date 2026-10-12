import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { SeasonRecurrence } from '@prisma/client';

// Los campos de ancla aplican solo al tipo de recurrencia elegido (validado en
// SeasonsService.assertValidAnchors, no aquí, porque la regla depende de más
// de un campo a la vez — class-validator no expresa bien ese "solo si X").
export class CreateSeasonDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(SeasonRecurrence)
  recurrence: SeasonRecurrence;

  // ONE_TIME
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // WEEKLY (0 = domingo, 6 = sábado — Date#getDay())
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  startWeekday?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  endWeekday?: number;

  // MONTHLY
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  startDayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  endDayOfMonth?: number;

  // YEARLY (sin año)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  startDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  endDay?: number;

  // Recordatorio opcional, aplica tanto al inicio como al fin del evento.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  reminderDaysBefore?: number;
}
