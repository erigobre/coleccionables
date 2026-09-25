import { getSession } from './session';

// El navegador nunca habla directo con la API — todo pasa por este server de
// Next.js, que reenvía el JWT guardado en cookie httpOnly (ver session.ts).
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.frikidex.com';

export class BackendError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

interface BackendFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string;
}

export async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const accessToken = options.accessToken ?? (await getSession())?.accessToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new BackendError(response.status, extractMessage(payload, `Error ${response.status}`));
  }

  return payload as T;
}
