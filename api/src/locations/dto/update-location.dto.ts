import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
