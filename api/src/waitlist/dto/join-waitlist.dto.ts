import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinWaitlistDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  interest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  // Honeypot: campo oculto en el form que un humano nunca llena (se oculta
  // por CSS). Si viene con contenido, es un bot.
  @IsOptional()
  @IsString()
  website?: string;
}
