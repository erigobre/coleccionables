import { OnboardingOptionKind } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

// Catálogo administrable de las opciones del onboarding (qué coleccionas /
// dónde lo tienes) — mismo modelo que GET /onboarding/options.
export class CreateOnboardingOptionDto {
  @IsEnum(OnboardingOptionKind)
  kind: OnboardingOptionKind;

  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @MinLength(1)
  icon: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// code es la clave estable, no se edita una vez creada.
export class UpdateOnboardingOptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
