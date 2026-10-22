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
//
// Timeout obligatorio: StoreKit/Google Play a veces no disparan ninguno de
// los dos listeners (compra "deferred", revalidación de pago, o un evento
// que la librería nativa no emite en cierto caso límite) — sin esto, la
// Promise se queda pendiente para siempre y la UI que hace `await` sobre
// ella (ej. el spinner de compra en NoFtModal) se congela sin error ni
// manera de reintentar (bug real reportado 2026-10-21). Si StoreKit sí cobró
// pero el timeout gana la carrera, la transacción queda sin terminar y
// drainUnfinishedTransactions la recoge en el próximo arranque de la app.
const NATIVE_PURCHASE_TIMEOUT_MS = 45_000;

function awaitNativePurchase(sku: string): Promise<Purchase> {
  return new Promise((resolve, reject) => {
    const settle = (fn: () => void) => {
      clearTimeout(timeoutId);
      updatedSub.remove();
      errorSub.remove();
      fn();
    };
    const updatedSub = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== sku) return;
      settle(() => resolve(purchase));
    });
    const errorSub = purchaseErrorListener((error: ExpoPurchaseError) => {
      if (error.productId && error.productId !== sku) return;
      settle(() => reject(error));
    });
    const timeoutId = setTimeout(() => {
      settle(() =>
        reject(new Error('La tienda no respondió a tiempo. Si se te cobró, los FrikiTokens se agregarán solos.')),
      );
    }, NATIVE_PURCHASE_TIMEOUT_MS);
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
