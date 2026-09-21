import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, loginRequest, registerRequest, type AuthTokens } from '../lib/api';
import { clearTokens, decodeJwtPayload, loadTokens, saveTokens } from '../lib/auth-storage';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fields: { name: string; organizationName: string; email: string; password: string }) => Promise<void>;
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

  const applyTokens = useCallback(async (next: AuthTokens) => {
    await saveTokens(next);
    setTokens(next);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await loginRequest({ email, password });
      await applyTokens(next);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (fields: { name: string; organizationName: string; email: string; password: string }) => {
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

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'No se pudo conectar con el servidor. Intenta de nuevo.';
}
