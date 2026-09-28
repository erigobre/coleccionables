import { SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SetSaleDto {
  @IsEnum(SaleStatus)
  status: SaleStatus;

  // Obligatorio para FOR_SALE / RESERVED (se valida en el servicio); en SOLD se
  // conserva el precio anterior y no se muestra públicamente.
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99_999_999)
  price?: number;
}
