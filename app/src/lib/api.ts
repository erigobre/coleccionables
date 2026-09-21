// Default apunta al backend NestJS ya desplegado en Coolify (ver
// deploy/.env → APP_PUBLIC_URL). Se puede sobreescribir con EXPO_PUBLIC_API_URL
// para apuntar a un backend local durante desarrollo.
// TODO: mover a https://api.frikidex.com cuando se configure el dominio
// (frikidex.com / frikidex.app) en Coolify.
const DEFAULT_API_URL = 'http://wfjhkiodddiyyoarjxxlj4jz.108.174.152.198.sslip.io';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload, 'Ocurrió un error inesperado'), payload);
  }

  return payload as T;
}

// Las fotos se guardan en la BD como ruta relativa del backend (`/uploads/x.jpg`).
export function resolvePhotoUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_BASE_URL}${url}`;
}

// Para multipart NO se fija Content-Type: fetch lo arma con el boundary correcto.
export async function apiUpload<T>(path: string, form: FormData, accessToken: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload, 'Ocurrió un error inesperado'), payload);
  }

  return payload as T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export function registerRequest(dto: {
  name: string;
  organizationName: string;
  email: string;
  password: string;
}) {
  return apiFetch<AuthTokens>('/auth/register', { method: 'POST', body: dto });
}

export function loginRequest(dto: { email: string; password: string }) {
  return apiFetch<AuthTokens>('/auth/login', { method: 'POST', body: dto });
}

export function refreshRequest(refreshToken: string) {
  return apiFetch<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } });
}
