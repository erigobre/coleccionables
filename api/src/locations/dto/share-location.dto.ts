import { IsIn, IsString } from 'class-validator';

export class ShareLocationDto {
  @IsString()
  userId: string;

  @IsIn(['VIEWER', 'EDITOR'])
  role: 'VIEWER' | 'EDITOR';
}
