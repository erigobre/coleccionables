import { ThemePreference } from '@prisma/client';
import { IsArray, IsEnum, IsString } from 'class-validator';

export class CompleteOnboardingDto {
  @IsArray()
  @IsString({ each: true })
  collectingCodes: string[];

  @IsArray()
  @IsString({ each: true })
  locationCodes: string[];

  @IsEnum(ThemePreference)
  theme: ThemePreference;
}
