import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import { fetchFtBalance, fetchFtCatalog, type FtServiceConfig, type FtServiceKey } from '../lib/ft';

interface FtContextValue {
  balance: number | null;
  catalog: FtServiceConfig[];
  costOf: (key: FtServiceKey) => number | null;
  refresh: () => Promise<void>;
}

const FtContext = createContext<FtContextValue | null>(null);

// Saldo y catálogo de costos de FrikiTokens, disponibles en toda la app
// autenticada. `refresh()` se llama después de cada acción que cobra FT (el
// backend no avisa por push cuando cambia el saldo).
export function FtProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<FtServiceConfig[]>([]);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setBalance(null);
      return;
    }
    try {
      const [balanceResult, catalogResult] = await Promise.all([
        fetchFtBalance(accessToken),
        fetchFtCatalog(accessToken),
      ]);
      setBalance(balanceResult.balance);
      setCatalog(catalogResult);
    } catch {
      // Silencioso a propósito: el saldo es informativo, no debe romper
      // pantallas si /ft está caído. Cada acción que sí cobra FT ya muestra
      // su propio error (402/500) al intentar ejecutarse.
    }
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const costOf = useCallback((key: FtServiceKey) => catalog.find((c) => c.key === key)?.ftCost ?? null, [catalog]);

  const value = useMemo<FtContextValue>(() => ({ balance, catalog, costOf, refresh }), [balance, catalog, costOf, refresh]);

  return <FtContext.Provider value={value}>{children}</FtContext.Provider>;
}

export function useFt(): FtContextValue {
  const ctx = useContext(FtContext);
  if (!ctx) throw new Error('useFt debe usarse dentro de FtProvider');
  return ctx;
}

// Mensaje uniforme para el error 402 (INSUFFICIENT_FT) que tira el backend.
export function insufficientFtMessage(details: unknown): string {
  if (details && typeof details === 'object' && 'required' in details && 'available' in details) {
    const { required, available } = details as { required: number; available: number };
    return `Te faltan FrikiTokens para esta acción: necesitas ${required} y tienes ${available}.`;
  }
  return 'No tienes suficientes FrikiTokens para esta acción.';
}
