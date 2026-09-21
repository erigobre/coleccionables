import { IsNumber, IsOptional, IsString } from 'class-validator';

// Plan §5.4.3: edición manual limitada a "dónde lo encontraste" y "precio en que lo viste".
export class UpdateWishlistItemDto {
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
