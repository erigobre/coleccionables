import { File, Paths } from 'expo-file-system';
import { clearPin } from './app-lock';
import { clearTokens } from './auth-storage';

// iOS guarda en el Keychain (expo-secure-store) la sesión y el PIN, y el Keychain
// sobrevive a desinstalar la app. El directorio de documentos sí se borra. Si el
// marcador no existe, es una instalación nueva (o una reinstalación): se limpia lo
// que quedó en el Keychain para que eliminar la app de verdad cierre la sesión y
// quite el bloqueo por PIN.
const MARKER = new File(Paths.document, 'install-marker');
let ready: Promise<void> | null = null;

export function freshInstallReady(): Promise<void> {
  ready ??= resetKeychainOnFreshInstall();
  return ready;
}

async function resetKeychainOnFreshInstall(): Promise<void> {
  try {
    if (MARKER.exists) return;
    await Promise.all([clearTokens(), clearPin()]);
    MARKER.create();
  } catch {
    // Si esto falla no se bloquea la app; en el peor caso se conserva la sesión anterior
    // y se reintenta en el siguiente arranque.
  }
}
