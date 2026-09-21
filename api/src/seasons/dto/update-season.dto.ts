import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSeasonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
