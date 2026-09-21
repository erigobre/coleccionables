import { IsEmail, IsString } from 'class-validator';

export class InitiateTransferDto {
  @IsString()
  itemId: string;

  @IsEmail()
  toUserEmail: string;
}
