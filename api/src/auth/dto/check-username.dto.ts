import { IsString, Matches } from 'class-validator';

export class CheckUsernameDto {
  // Mismo formato que RegisterDto.username.
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message: 'El usuario debe tener 3-20 caracteres: minúsculas, números o guion bajo',
  })
  username: string;
}
