import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ItemCategory } from '@prisma/client';

// Alimenta el flujo "¿Ya lo tengo?" de Home (plan §7.2): se compara contra los
// objetos existentes del usuario usando un score ponderado por coincidencias.
export class MatchItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  toyLine?: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
