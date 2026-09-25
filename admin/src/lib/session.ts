import { cookies } from 'next/headers';
import { decodeJwtPayload } from './jwt';

export const ACCESS_COOKIE = 'admin_access';
export const REFRESH_COOKIE = 'admin_refresh';

// secure:false en dev para poder probar `npm run dev` en http://localhost
// (ver plan Fase 9 — prueba manual local contra la API de producción).
const isProd = process.env.NODE_ENV === 'production';
export const ACCESS_COOKIE_OPTIONS = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
export const REFRESH_COOKIE_OPTIONS = { ...ACCESS_COOKIE_OPTIONS, maxAge: 60 * 60 * 24 * 30 };

export interface AdminSessionUser {
  sub: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  organizationId: string;
}

// Server Components solo pueden leer cookies, no escribirlas — el refresh y
// re-escritura de cookies vive en middleware.ts, el único lugar (junto con
// las Server Actions de login/logout) donde se escriben estas cookies.
export async function getSession(): Promise<{ accessToken: string; user: AdminSessionUser } | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;
  const user = decodeJwtPayload<AdminSessionUser>(accessToken);
  if (!user) return null;
  return { accessToken, user };
}
