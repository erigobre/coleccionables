import { IsBoolean, IsOptional, IsString } from 'class-validator';

// Panel Superadmin: revisar un incidente de moderación (plan de bloqueo de
// contenido no apto, confirmado con el owner 2026-09-22).
export class ResolveModerationFlagDto {
  @IsOptional()
  @IsString()
  resolution?: string;

  // Si el incidente resulta ser un falso positivo (ej. una figura con rostro
  // realista mal detectada como persona), permite reactivar la cuenta desde
  // el mismo endpoint sin un paso aparte.
  @IsOptional()
  @IsBoolean()
  reactivateUser?: boolean;
}
