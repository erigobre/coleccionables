import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

// Registro manual de pago (plan §5.6/Fase 9): la pasarela real (Stripe u
// otra) llega en Fase 2 de negocio, pero el modelo/flujo ya existe desde v1.
export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}
