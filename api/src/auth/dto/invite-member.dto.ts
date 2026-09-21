import { IsEmail, IsString, MinLength } from 'class-validator';

// Cuenta tipo familia/negocio (decisión confirmada en docs/00-PLAN-MAESTRO.md):
// varios usuarios bajo la misma Organization/plan. En v1 cada miembro tiene
// sus propias colecciones/objetos/ubicaciones individuales (no compartidos).
export class InviteMemberDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  temporaryPassword: string;
}
