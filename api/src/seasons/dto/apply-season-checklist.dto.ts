import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class ApplySeasonChecklistDto {
  @IsIn(['start', 'end'])
  direction: 'start' | 'end';

  // Si se omite, aplica a todos los objetos pendientes de esa dirección.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];
}
