import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifySubscriptionPurchaseDto {
  @IsIn(['IOS', 'ANDROID'])
  platform: 'IOS' | 'ANDROID';

  @IsString()
  @MinLength(1)
  ftPlanCode: string;

  @IsOptional()
  @IsString()
  iosTransactionJws?: string;

  @IsOptional()
  @IsString()
  androidPurchaseToken?: string;

  @IsOptional()
  @IsString()
  androidProductId?: string;
}
