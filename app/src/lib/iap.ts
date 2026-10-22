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
//
// El timeout tiene que envolver TAMBIÉN el `await requestPurchase(...)`, no
// solo la espera de los listeners: si el SKU no existe para la tienda (ej.
// un ID de producto mal configurado), la llamada nativa puede quedarse
// pendiente sin disparar ni error ni listener, y antes el timeout nunca
// llegaba a correr porque nadie esperaba esa Promise todavía (congelamiento
// real reportado 2026-10-21 con el paquete de 100 FT).
const NATIVE_PURCHASE_TIMEOUT_MS = 45_000;

function withPurchaseTimeout<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('La tienda no respondió a tiempo. Si se te cobró, los FrikiTokens se agregarán solos.'));
    }, NATIVE_PURCHASE_TIMEOUT_MS);
    run().then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

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
  return withPurchaseTimeout(async () => {
    const pending = awaitNativePurchase(sku);
    await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'in-app' });
    return pending;
  });
}

export async function purchaseSubscription(sku: string): Promise<Purchase> {
  return withPurchaseTimeout(async () => {
    const pending = awaitNativePurchase(sku);
    await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'subs' });
    return pending;
  });
}

// Para mostrar en pantalla qué devolvió exactamente StoreKit/Google Play —
// `code`/`responseCode`/`productId`/`debugMessage` son justo los campos que
// authErrorMessage() descarta (solo usa name+message), y son los que hacen
// falta para diagnosticar un error nativo sin acceso a logs remotos.
export function describePurchaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as Record<string, unknown>;
  const parts: string[] = [];
  if (e.code !== undefined) parts.push(`code=${String(e.code)}`);
  if (e.responseCode !== undefined) parts.push(`responseCode=${String(e.responseCode)}`);
  if (e.productId) parts.push(`productId=${String(e.productId)}`);
  if (e.debugMessage) parts.push(`debug=${String(e.debugMessage)}`);
  if (e.message) parts.push(`message=${String(e.message)}`);
  return parts.length ? parts.join(' | ') : String(err);
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
