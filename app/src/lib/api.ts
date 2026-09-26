import { clearTokens as clearStoredTokens, loadTokens, saveTokens } from './auth-storage';

// Default apunta al backend NestJS ya desplegado en Coolify (ver
// deploy/.env → APP_PUBLIC_URL). Se puede sobreescribir con EXPO_PUBLIC_API_URL
// para apuntar a un backend local durante desarrollo.
const DEFAULT_API_URL = 'https://api.frikidex.com';

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

// El cuerpo de una respuesta de error a veces no es JSON (ej. una página HTML
// de error de un proxy/gateway con un timeout) — antes esto tiraba un
// SyntaxError sin capturar que se veía como "no se pudo conectar".
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function throwIfError(response: Response): Promise<unknown> {
  const payload = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(payload, `Ocurrió un error inesperado (código ${response.status})`),
      payload,
    );
  }
  return payload;
}

// FrikiTokens: toda acción que cobra FT necesita un Idempotency-Key (para que
// un reintento de red no cobre 2 veces la misma acción). Se genera una llave
// nueva por cada llamada a apiFetch y se reutiliza en el reintento
// interno tras un refresh de token (sigue siendo la misma acción lógica).
// No hace falta que sea criptográficamente única: solo distinguir intentos
// de la misma acción entre sí.
let idempotencyCounter = 0;
function generateIdempotencyKey(): string {
  idempotencyCounter = (idempotencyCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${idempotencyCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- Renovación transparente del access token ---
// El access token dura 15 minutos y antes nunca se renovaba: cualquier
// pantalla abierta más tiempo que eso empezaba a recibir 401 "Unauthorized" o
// se quedaba cargando para siempre. AuthProvider se suscribe con
// setTokenListener para mantener su estado sincronizado con lo que pase acá.
export type AuthTokens = { accessToken: string; refreshToken: string };
type TokenListener = (tokens: AuthTokens | null) => void;

let tokenListener: TokenListener | null = null;
export function setTokenListener(fn: TokenListener | null): void {
  tokenListener = fn;
}

let refreshPromise: Promise<string | null> | null = null;

// Un solo refresh en vuelo aunque varias peticiones reciban 401 al mismo tiempo.
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const stored = await loadTokens();
        if (!stored) return null;
        const fresh = await refreshRequest(stored.refreshToken);
        await saveTokens(fresh);
        tokenListener?.(fresh);
        return fresh.accessToken;
      } catch {
        await clearStoredTokens();
        tokenListener?.(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// Sin esto, fetch() en RN no tiene timeout: si el servidor o el proxy se
// quedan colgados (ej. un lock de BD, un proxy que no cierra la conexión) la
// pantalla se queda "pasmada" para siempre en vez de mostrar un error
// (reportado 2026-09-26 con el overlay de "Analizando el objeto..." trabado).
const REQUEST_TIMEOUT_MS = 60_000;

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, accessToken } = options;
  const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;
  const idempotencyKey = generateIdempotencyKey();

  const request = (token?: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    return fetch(`${API_BASE_URL}${path}`, { method, headers, body: serializedBody, signal: controller.signal }).finally(
      () => clearTimeout(timeoutId),
    );
  };

  const response = await request(accessToken);

  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return (await throwIfError(await request(newToken))) as T;
    }
  }

  return (await throwIfError(response)) as T;
}

// Las fotos se guardan en la BD como ruta relativa del backend (`/uploads/x.jpg`).
export function resolvePhotoUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_BASE_URL}${url}`;
}

export function registerRequest(dto: {
  name: string;
  username: string;
  email: string;
  password: string;
  acceptedLegal: boolean;
}) {
  return apiFetch<AuthTokens>('/auth/register', { method: 'POST', body: dto });
}

export function checkUsernameAvailability(username: string) {
  return apiFetch<{ available: boolean; suggestion: string | null; blocked: boolean }>(
    `/auth/username-availability?username=${encodeURIComponent(username)}`,
  );
}

export function loginRequest(dto: { email: string; password: string }) {
  return apiFetch<AuthTokens>('/auth/login', { method: 'POST', body: dto });
}

export function refreshRequest(refreshToken: string) {
  return apiFetch<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } });
}
