import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RemoveMemberMode {
  DETACH = 'DETACH',
  TRANSFER = 'TRANSFER',
}

export class RemoveMemberDto {
  @IsEnum(RemoveMemberMode)
  mode: RemoveMemberMode;

  // Requerido solo en modo TRANSFER: a quién se le pide ceder los objetos.
  @IsOptional()
  @IsString()
  transferToUserId?: string;
}
