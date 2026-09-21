import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum LocationChangeDestination {
  LOCATION = 'LOCATION',
  DONATED = 'DONATED',
  LOST = 'LOST',
}

export enum LocationChangeAssignment {
  INDEFINIDO = 'INDEFINIDO',
  TEMPORAL = 'TEMPORAL',
}

// Modal multi-paso (plan §5.3.9.9):
// Paso 1: destino (ubicación existente | Donado | Perdido — "Vendido" usa TransfersModule).
// Paso 2 (si destino = ubicación): ¿Indefinido o Temporal?
// Paso 3 (si Temporal): a qué Temporada se liga.
export class ChangeLocationDto {
  @IsEnum(LocationChangeDestination)
  destination: LocationChangeDestination;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsEnum(LocationChangeAssignment)
  assignment?: LocationChangeAssignment;

  @IsOptional()
  @IsString()
  seasonId?: string;
}
