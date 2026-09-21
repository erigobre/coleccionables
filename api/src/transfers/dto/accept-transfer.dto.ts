import { IsString } from 'class-validator';

export class AcceptTransferDto {
  @IsString()
  targetCollectionId: string;
}
