import { Equals, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  // @usuario único (estilo Instagram/Twitter): solo minúsculas, números y guion bajo.
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message: 'El usuario debe tener 3-20 caracteres: minúsculas, números o guion bajo',
  })
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Checkbox obligatorio de "Acepto la política de privacidad y las
  // condiciones de uso" en la app ya actualizada. Las versiones publicadas en
  // las tiendas ANTES de que este campo existiera no lo mandan — por
  // compatibilidad se acepta que venga ausente (esas cuentas simplemente no
  // quedan con versión/fecha de aceptación registrada), pero si viene debe
  // ser explícitamente `true`. La versión exacta aceptada se guarda en
  // auth.service.ts, no aquí.
  @IsOptional()
  @Equals(true, { message: 'Debes aceptar la política de privacidad y las condiciones de uso' })
  acceptedLegal?: boolean;
}
