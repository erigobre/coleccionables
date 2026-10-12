import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { ConservationState, ItemCategory } from '@prisma/client';

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

  // Info extendida detectada por la IA (ver schema.prisma WishlistItem): no se
  // muestra en la wishlist, solo prellena el alta si el usuario la traspasa.
  @IsOptional()
  @IsEnum(ConservationState)
  conservationState?: ConservationState;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  toyLine?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsString()
  scale?: string;

  @IsOptional()
  @IsString()
  designer?: string;

  @IsOptional()
  @IsInt()
  releaseYear?: number;

  @IsOptional()
  @IsString()
  originalSetNumber?: string;

  @IsOptional()
  @IsString()
  uniqueIdentifier?: string;

  @IsOptional()
  @IsString()
  comicCoverNumber?: string;

  @IsOptional()
  @IsString()
  comicIssueNumber?: string;

  @IsOptional()
  @IsString()
  comicWriter?: string;

  @IsOptional()
  @IsString()
  comicPenciler?: string;

  @IsOptional()
  @IsString()
  comicInker?: string;

  @IsOptional()
  @IsString()
  comicColorist?: string;

  @IsOptional()
  @IsString()
  comicPublisher?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedTags?: string[];

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
