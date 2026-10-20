import { apiFetch } from './api';
import type { FtPackageOption, FtPlanOption } from './ft';
import type { IapPlatform } from './iap';

export interface IapCatalogPackage extends FtPackageOption {
  storeProductIdIos: string | null;
  storeProductIdAndroid: string | null;
}

export interface IapCatalogPlan extends FtPlanOption {
  storeProductIdIos: string | null;
  storeProductIdAndroid: string | null;
}

// A diferencia de /ft/packages y /ft/plans (públicos), este incluye los IDs
// de producto de cada tienda — solo logueado, los necesita el cliente nativo
// para fetchProducts()/requestPurchase().
export function fetchIapCatalog(accessToken: string) {
  return apiFetch<{ packages: IapCatalogPackage[]; plans: IapCatalogPlan[] }>('/iap/catalog', { accessToken });
}

interface VerifyPurchaseBase {
  platform: IapPlatform;
  iosTransactionJws?: string;
  androidPurchaseToken?: string;
  androidProductId?: string;
}

export interface VerifyPackagePurchaseDto extends VerifyPurchaseBase {
  ftPackageCode: string;
}

export interface VerifyPackagePurchaseResult {
  success: true;
  ftAmount: number;
  alreadyProcessed: boolean;
}

export function verifyPackagePurchase(accessToken: string, dto: VerifyPackagePurchaseDto) {
  return apiFetch<VerifyPackagePurchaseResult>('/iap/packages/verify', { method: 'POST', body: dto, accessToken });
}

export interface VerifySubscriptionPurchaseDto extends VerifyPurchaseBase {
  ftPlanCode: string;
}

export interface VerifySubscriptionPurchaseResult {
  success: true;
}

export function verifySubscriptionPurchase(accessToken: string, dto: VerifySubscriptionPurchaseDto) {
  return apiFetch<VerifySubscriptionPurchaseResult>('/iap/subscriptions/verify', { method: 'POST', body: dto, accessToken });
}
