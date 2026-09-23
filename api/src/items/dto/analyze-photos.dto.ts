import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { PhotoInputDto } from '../../common/dto/photo-input.dto.js';

export class AnalyzePhotosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => PhotoInputDto)
  photos!: PhotoInputDto[];
}
