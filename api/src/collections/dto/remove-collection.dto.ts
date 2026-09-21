import { IsOptional, IsString } from 'class-validator';

export class RemoveCollectionDto {
  // Si la colección tiene objetos, se debe indicar a dónde migrarlos antes de poder eliminarla.
  @IsOptional()
  @IsString()
  migrateToCollectionId?: string;
}
