import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { ItemCategory } from '@prisma/client';

export class CreateWishlistItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  foundAt?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
