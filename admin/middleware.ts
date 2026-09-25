import { NextRequest, NextResponse } from 'next/server';
import { decodeJwtPayload, isExpired } from '@/lib/jwt';
import { ACCESS_COOKIE, ACCESS_COOKIE_OPTIONS, REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS } from '@/lib/session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.frikidex.com';

interface AccessPayload {
  exp: number;
  role: string;
}

function setSessionCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

// Único lugar (junto con las Server Actions de login/logout) donde se
// escriben las cookies de sesión: los Server Components solo pueden leerlas.
export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const payload = accessToken ? decodeJwtPayload<AccessPayload>(accessToken) : null;

  if (payload && !isExpired(payload) && payload.role === 'SUPERADMIN') {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
        const freshPayload = decodeJwtPayload<AccessPayload>(tokens.accessToken);
        if (freshPayload?.role === 'SUPERADMIN') {
          const response = NextResponse.next();
          setSessionCookies(response, tokens);
          return response;
        }
      }
    } catch {
      // Si falla el refresh (red caída, etc.), sigue al redirect de login.
    }
  }

  return redirectToLogin(request);
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
