import { IsOptional, IsString, MinLength } from 'class-validator';

// Las fotos viajan como base64 dentro del JSON, no como multipart/form-data:
// bajo la New Architecture de React Native, FormData.append({uri,name,type})
// + fetch() falla en Android con "Unsupported FormData part implementation".
export class PhotoInputDto {
  @IsString()
  @MinLength(1)
  imageBase64!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
