import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportRequestDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @IsString()
  @MaxLength(2000)
  message: string;

  // Honeypot: campo oculto en el form que un humano nunca llena (se oculta
  // por CSS). Si viene con contenido, es un bot.
  @IsOptional()
  @IsString()
  website?: string;
}
