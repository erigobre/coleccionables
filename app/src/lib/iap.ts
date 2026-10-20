import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type ExpoPurchaseError,
  type Product,
  type Purchase,
} from 'expo-iap';

export type IapPlatform = 'IOS' | 'ANDROID';

// `store` ya lo da expo-iap unificado ('apple' | 'google' | ...) — esto solo
// lo traduce al enum IapPlatform que espera el backend.
export function storeToPlatform(storeId: string): IapPlatform {
  return storeId === 'apple' ? 'IOS' : 'ANDROID';
}

let connected = false;

export async function initIapConnection(): Promise<void> {
  if (connected) return;
  await initConnection();
  connected = true;
}

export async function endIapConnection(): Promise<void> {
  if (!connected) return;
  await endConnection();
  connected = false;
}

export async function fetchNativeProducts(skus: string[], type: 'in-app' | 'subs' = 'in-app'): Promise<Product[]> {
  if (!skus.length) return [];
  const products = await fetchProducts({ skus, type });
  return (products as Product[] | null) ?? [];
}

// requestPurchase() no resuelve con el resultado real de la compra (así lo
// documenta expo-iap): el resultado llega por purchaseUpdatedListener /
// purchaseErrorListener. Esta función envuelve ambos en una sola Promise
// para poder usar purchasePackage/purchaseSubscription como un await normal.
function awaitNativePurchase(sku: string): Promise<Purchase> {
  return new Promise((resolve, reject) => {
    const updatedSub = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== sku) return;
      updatedSub.remove();
      errorSub.remove();
      resolve(purchase);
    });
    const errorSub = purchaseErrorListener((error: ExpoPurchaseError) => {
      if (error.productId && error.productId !== sku) return;
      updatedSub.remove();
      errorSub.remove();
      reject(error);
    });
  });
}

export async function purchasePackage(sku: string): Promise<Purchase> {
  const pending = awaitNativePurchase(sku);
  await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'in-app' });
  return pending;
}

export async function purchaseSubscription(sku: string): Promise<Purchase> {
  const pending = awaitNativePurchase(sku);
  await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'subs' });
  return pending;
}

export async function finishPurchase(purchase: Purchase, isConsumable: boolean): Promise<void> {
  await finishTransaction({ purchase, isConsumable });
}

export interface DrainVerifyResult {
  success: boolean;
  isConsumable: boolean;
}

// Corre en el bootstrap de la app (ver _layout.tsx): si una compra ya se
// cobró pero el verify contra el backend no se completó antes (ej. la app se
// cerró a medio camino), StoreKit/Google Play la siguen reportando aquí hasta
// que se llame finishTransaction — así nunca se pierde una compra ya pagada.
export async function drainUnfinishedTransactions(verify: (purchase: Purchase) => Promise<DrainVerifyResult>): Promise<void> {
  const pending = await getAvailablePurchases();
  for (const purchase of pending) {
    try {
      const result = await verify(purchase);
      if (result.success) {
        await finishTransaction({ purchase, isConsumable: result.isConsumable });
      }
    } catch {
      // Se reintenta en el próximo arranque; la transacción sigue sin terminar.
    }
  }
}
