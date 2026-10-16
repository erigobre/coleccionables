import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateFtServiceConfigDto {
  @IsInt()
  @Min(0)
  ftCost: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
