// Decodifica el payload de un JWT sin verificar la firma — la verificación
// real la hace el backend en cada llamada (backendFetch reenvía el token tal
// cual). Aquí solo se usa para leer `role`/`exp` y decidir si hay que
// refrescar o redirigir a /login. Funciona tanto en middleware (Edge) como en
// Server Components/Actions (Node) porque usa solo Web APIs (atob).
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function isExpired(payload: { exp?: number } | null): boolean {
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
