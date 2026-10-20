import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyPackagePurchaseDto {
  @IsIn(['IOS', 'ANDROID'])
  platform: 'IOS' | 'ANDROID';

  @IsString()
  @MinLength(1)
  ftPackageCode: string;

  // Requerido si platform === 'IOS': el signedTransaction (JWS) devuelto por
  // StoreKit 2 tras la compra, sin verificar todavía por el cliente.
  @IsOptional()
  @IsString()
  iosTransactionJws?: string;

  // Requeridos si platform === 'ANDROID'.
  @IsOptional()
  @IsString()
  androidPurchaseToken?: string;

  @IsOptional()
  @IsString()
  androidProductId?: string;
}
