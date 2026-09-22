import { IsEmail, IsString, MinLength } from 'class-validator';

export class BootstrapSuperadminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  secret: string;
}
