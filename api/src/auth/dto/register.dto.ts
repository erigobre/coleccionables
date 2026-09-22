import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

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
}
