'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeJwtPayload } from '@/lib/jwt';
import { ACCESS_COOKIE, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.frikidex.com';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña' };
  }

  let tokens: { accessToken: string; refreshToken: string };
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      return { error: (payload?.message as string | undefined) ?? 'Credenciales inválidas' };
    }
    tokens = await res.json();
  } catch {
    return { error: 'No se pudo conectar con el servidor' };
  }

  // Login válido no basta: si no es SUPERADMIN, no es su panel y no se le
  // deja sesión iniciada (aunque el backend aceptó las credenciales).
  const payload = decodeJwtPayload<{ role: string }>(tokens.accessToken);
  if (payload?.role !== 'SUPERADMIN') {
    return { error: 'Esta cuenta no tiene permisos de administrador' };
  }

  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  store.set(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  redirect('/login');
}
