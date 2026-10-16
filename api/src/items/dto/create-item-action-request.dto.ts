import { ItemActionRequestType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsNumber, Max, Min, ValidateIf } from 'class-validator';

export class CreateItemActionRequestDto {
  @IsEnum(ItemActionRequestType)
  action: ItemActionRequestType;

  // Solo TRANSFER.
  @ValidateIf((dto: CreateItemActionRequestDto) => dto.action === ItemActionRequestType.TRANSFER)
  @IsEmail()
  toEmail?: string;

  // Solo SELL.
  @ValidateIf((dto: CreateItemActionRequestDto) => dto.action === ItemActionRequestType.SELL)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999)
  price?: number;
}
