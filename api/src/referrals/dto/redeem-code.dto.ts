import { IsString, MinLength } from 'class-validator';

export class RedeemCodeDto {
  @IsString()
  @MinLength(4)
  code: string;
}
