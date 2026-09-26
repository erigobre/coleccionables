import { IsBoolean, IsDateString, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

// Paquete de compra única de FT (FtPackage): mismo modelo que alimenta
// GET /ft/packages (landing pública y el modal "sin FrikiTokens" de la app).
export class CreateFtPackageDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsInt()
  @IsPositive()
  ftAmount: number;

  @IsInt()
  @IsPositive()
  priceMxnCents: number;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;
}

export class UpdateFtPackageDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  ftAmount?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  priceMxnCents?: number;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;
}
