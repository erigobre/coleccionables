import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

// Edición manual de datos de una organización desde el panel Superadmin.
// `sponsored` sigue teniendo sus propios endpoints dedicados (sponsor/
// unsponsor) porque ese toggle también decide `subscriptionStatus` por su
// cuenta; aquí solo se tocan campos "planos" sin ese efecto secundario.
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;
}
