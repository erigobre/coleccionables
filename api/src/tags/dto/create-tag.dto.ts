import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { TagType } from '@prisma/client';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEnum(TagType)
  type?: TagType;
}
