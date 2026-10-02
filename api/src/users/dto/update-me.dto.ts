import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  // Ruta relativa devuelta por /storage/upload (igual que Item.avatarUrl, ver
  // create-item.dto.ts), no una URL absoluta.
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
