import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  ItemCategory,
  PackagingCondition,
  UsageState,
  ConservationState,
} from '@prisma/client';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(ItemCategory)
  category: ItemCategory;

  @IsEnum(PackagingCondition)
  packagingCondition: PackagingCondition;

  @IsEnum(UsageState)
  usageState: UsageState;

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
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @IsString()
  purchaseLocationText?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isGift?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

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

  // null/omitido = "Sin ubicación" (default al crear, plan §5.3.14).
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collectionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  // Recorte 1:1 del objeto (de analyzePhotos, vía bounding box de Gemini). Si
  // se omite y hay photoUrls, el backend genera un recorte centrado como
  // respaldo — ver ItemsService.create.
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
