import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { IapService } from './iap.service.js';
import { VerifyPackagePurchaseDto } from './dto/verify-package-purchase.dto.js';
import { VerifySubscriptionPurchaseDto } from './dto/verify-subscription-purchase.dto.js';

@Controller('iap')
@UseGuards(JwtAuthGuard)
export class IapController {
  constructor(private readonly iapService: IapService) {}

  // Incluye storeProductIdIos/Android — a diferencia de /ft/packages y
  // /ft/plans (públicos), esta ruta solo la necesita el cliente nativo para
  // pedirle el precio real a StoreKit/Google Play.
  @Get('catalog')
  getCatalog() {
    return this.iapService.getCatalog();
  }

  @Post('packages/verify')
  verifyPackagePurchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyPackagePurchaseDto) {
    return this.iapService.verifyPackagePurchase(user, dto);
  }

  @Post('subscriptions/verify')
  verifySubscriptionPurchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifySubscriptionPurchaseDto) {
    return this.iapService.verifySubscriptionPurchase(user, dto);
  }
}
