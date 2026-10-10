import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from './api';

const ACCESS_TOKEN_KEY = 'frikidex.accessToken';
const REFRESH_TOKEN_KEY = 'frikidex.refreshToken';
const IDENTITY_MARKER_KEY = 'frikidex.lastIdentity';

export interface IdentityMarker {
  name: string;
  email: string;
}

// A diferencia de los tokens, este marcador se guarda a propósito para que
// sobreviva a una desinstalación (el Keychain de iOS no se borra con la app):
// permite mostrar "Hola de nuevo, {nombre}" en el login tras reinstalar, sin
// guardar nada sensible (ni contraseña ni tokens). Un logout manual sí lo
// borra (ver AuthProvider.logout) para que ese caso siempre vea el login en blanco.
export async function saveIdentityMarker(marker: IdentityMarker): Promise<void> {
  await SecureStore.setItemAsync(IDENTITY_MARKER_KEY, JSON.stringify(marker));
}

export async function loadIdentityMarker(): Promise<IdentityMarker | null> {
  const raw = await SecureStore.getItemAsync(IDENTITY_MARKER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IdentityMarker;
  } catch {
    return null;
  }
}

export async function clearIdentityMarker(): Promise<void> {
  await SecureStore.deleteItemAsync(IDENTITY_MARKER_KEY);
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function loadTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

// Decodifica el payload de un JWT sin verificar la firma — solo para leer
// datos de UI (nombre, email, rol); la verificación real la hace el backend.
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeBase64(padded);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64(input: string): string {
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of input) {
    if (char === '=') break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return decodeURIComponent(
    output
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
}
