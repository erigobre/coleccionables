import { IsInt } from 'class-validator';

export class UpdateFtConfigDto {
  @IsInt()
  value: number;
}
