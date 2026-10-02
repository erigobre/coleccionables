import { IsString, MinLength } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @MinLength(1)
  username: string;
}
