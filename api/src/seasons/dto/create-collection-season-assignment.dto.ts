import { IsString } from 'class-validator';

export class CreateCollectionSeasonAssignmentDto {
  @IsString()
  seasonId: string;

  @IsString()
  destinationLocationId: string;
}
