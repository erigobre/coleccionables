import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

// Plan de suscripción mensual de FT (FtPlan). v1 solo vende mensual (decisión
// de negocio 2026-09-23) — `annualPriceMxnCents`/`annualEnabled` ya existen en
// el modelo para activarlo después sin migrar de nuevo.
export class CreateFtPlanDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  label: string;

  @IsInt()
  @IsPositive()
  ftAmountMonthly: number;

  @IsInt()
  @IsPositive()
  monthlyPriceMxnCents: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  annualPriceMxnCents?: number;

  @IsOptional()
  @IsBoolean()
  annualEnabled?: boolean;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateFtPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ftAmountMonthly?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  monthlyPriceMxnCents?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  annualPriceMxnCents?: number;

  @IsOptional()
  @IsBoolean()
  annualEnabled?: boolean;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
