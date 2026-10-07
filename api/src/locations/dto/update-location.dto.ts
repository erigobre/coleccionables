import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { LOCATION_ICONS } from '../location-icons.js';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(LOCATION_ICONS)
  icon?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
