import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LocationChangeAssignment } from '../../items/dto/change-location.dto.js';

// Reubicar una colección completa: mismos pasos que el cambio de ubicación de un
// objeto (destino → indefinido/temporal → temporada), aplicados a todos sus objetos.
export class MoveCollectionDto {
  @IsString()
  locationId: string;

  @IsEnum(LocationChangeAssignment)
  assignment: LocationChangeAssignment;

  @IsOptional()
  @IsString()
  seasonId?: string;
}
