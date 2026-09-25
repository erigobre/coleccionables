import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, loginRequest, registerRequest, setTokenListener, type AuthTokens } from '../lib/api';
import { clearTokens, decodeJwtPayload, loadTokens, saveTokens } from '../lib/auth-storage';
import { registerPushToken } from '../lib/push';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  organizationId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fields: {
    name: string;
    username: string;
    email: string;
    password: string;
    acceptedLegal: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromTokens(tokens: AuthTokens): AuthUser | null {
  return decodeJwtPayload<AuthUser>(tokens.accessToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTokens()
      .then(setTokens)
      .finally(() => setIsLoading(false));
  }, []);

  // api.ts renueva el access token solo cuando expira (401) y avisa acá para
  // que el estado de React no quede desincronizado de lo que ya guardó en
  // SecureStore; si el refresh token también venció, avisa con `null` y esto
  // desloguea (Stack.Protected en _layout.tsx manda a la pantalla de login).
  useEffect(() => {
    setTokenListener(setTokens);
    return () => setTokenListener(null);
  }, []);

  const applyTokens = useCallback(async (next: AuthTokens) => {
    await saveTokens(next);
    setTokens(next);
    void registerPushToken(next.accessToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await loginRequest({ email, password });
      await applyTokens(next);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (fields: { name: string; username: string; email: string; password: string; acceptedLegal: boolean }) => {
      const next = await registerRequest(fields);
      await applyTokens(next);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setTokens(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: tokens ? userFromTokens(tokens) : null,
      accessToken: tokens?.accessToken ?? null,
      isLoading,
      login,
      register,
      logout,
    }),
    [tokens, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

// El detalle real del error (nombre + mensaje de la excepción JS/fetch) se
// agrega al final para poder diagnosticar fallas de red en producción sin
// acceso a la consola del dispositivo — sin esto, cualquier error no-ApiError
// se veía idéntico ("no se pudo conectar") sin importar la causa real.
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return `No se pudo conectar con el servidor. Intenta de nuevo.\n[${detail}]`;
}
