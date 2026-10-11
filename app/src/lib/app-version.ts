import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Platform } from 'react-native';
import { API_BASE_URL } from './api';

export function getBuildInfo() {
  const appVersion = Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? '?';
  const nativeBuild = Application.nativeBuildVersion ?? '?';
  const ota = Updates.isEmbeddedLaunch
    ? ({ applied: false } as const)
    : ({
        applied: true,
        shortId: Updates.updateId ? Updates.updateId.slice(0, 8) : '?',
        date: Updates.createdAt
          ? Updates.createdAt.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
          : '?',
        channel: Updates.channel ?? '?',
      } as const);
  return { appVersion, nativeBuild, ota };
}

export function formatBuildInfoLine(info: ReturnType<typeof getBuildInfo>) {
  const base = `v${info.appVersion} (build ${info.nativeBuild})`;
  if (!info.ota.applied) return `${base} · sin OTA aplicada`;
  return `${base} · OTA ${info.ota.date} (${info.ota.shortId}) · ${info.ota.channel}`;
}

export type AppUpdateCheckResult =
  | { kind: 'native-update'; latestBuildNumber: number }
  | { kind: 'ota-update'; message: string }
  | { kind: 'up-to-date' };

async function fetchLatestBuildNumber(): Promise<number | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ft/app-version`);
    if (!response.ok) return null;
    const data = await response.json();
    return Platform.OS === 'ios' ? data.iosBuildNumber ?? null : data.androidBuildNumber ?? null;
  } catch {
    // Sin internet o API caída: no bloquear el chequeo de OTA por esto.
    return null;
  }
}

// Nota: NO se llama a Updates.reloadAsync() aquí. Un crash reproducido en
// TestFlight (2026-10-10, reporte nativo: SIGABRT dentro de
// expo-updates/ErrorRecovery.crash(), sin ninguna línea de JS en el stack)
// confirma que el reinicio en caliente de expo-updates es frágil en esta
// versión del SDK. La única forma segura de aplicar una OTA ya descargada
// es un reinicio real del proceso (cerrar la app del todo).
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  const currentBuild = Number(Application.nativeBuildVersion ?? NaN);
  const latestBuild = await fetchLatestBuildNumber();

  if (latestBuild != null && !Number.isNaN(currentBuild) && latestBuild > currentBuild) {
    return { kind: 'native-update', latestBuildNumber: latestBuild };
  }

  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) {
    return { kind: 'up-to-date' };
  }
  const fetchResult = await Updates.fetchUpdateAsync();
  if (!fetchResult.isNew) {
    return { kind: 'up-to-date' };
  }
  return {
    kind: 'ota-update',
    message:
      'Actualización descargada. Para aplicarla, cierra la app por completo (deslízala hacia arriba en el selector de apps) y vuelve a abrirla. No la reinicies desde aquí: puede causar un cierre inesperado.',
  };
}

// La app todavía está en beta de TestFlight (no hay listado público en App
// Store), así que en iOS se abre la app de TestFlight directo en vez de un
// link de App Store que no existe. En Android se abre la ficha de Play Store
// (una vez que haya distribución ahí; si no existe el listado, Play Store
// muestra su propio error, que es preferible a no hacer nada).
export function openStoreForUpdate() {
  if (Platform.OS === 'ios') {
    return Linking.openURL('itms-beta://');
  }
  return Linking.openURL('market://details?id=com.frikidex.app');
}
