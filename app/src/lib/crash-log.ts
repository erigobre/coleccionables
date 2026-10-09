import { File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const LOG_FILE = new File(Paths.document, 'last-fatal-error.json');

// Los crashes reales de TestFlight (vía Apple) solo traen el stack nativo
// (Swift/Objective-C/Hermes), nunca el mensaje/stack de JS que los originó
// (confirmado 2026-10-09 leyendo varios crash logs reales). Este handler
// intercepta cualquier excepción de JS sin capturar y la guarda ANTES de
// dejar que siga su curso normal (que puede terminar en un crash nativo
// unos milisegundos después). File.write() es sincrónico (llamada JSI
// directa, sin passar por el puente), así que alcanza a escribirse incluso
// si el proceso muere justo después.
export function installGlobalErrorHandler() {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return;

  const originalHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    try {
      const err = error instanceof Error ? error : null;
      const payload = {
        message: err?.message ?? String(error),
        stack: err?.stack ?? null,
        isFatal: !!isFatal,
        timestamp: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version ?? null,
        buildVersion: Constants.nativeBuildVersion ?? null,
        updateId: Updates.updateId ?? null,
        isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      };
      LOG_FILE.write(JSON.stringify(payload, null, 2));
    } catch {
      // No bloquear el reporte/crash original por un fallo al guardar.
    }
    originalHandler(error, isFatal);
  });
}

export async function readLastFatalError(): Promise<string | null> {
  try {
    if (!LOG_FILE.exists) return null;
    return await LOG_FILE.text();
  } catch {
    return null;
  }
}

export function clearLastFatalError() {
  try {
    if (LOG_FILE.exists) LOG_FILE.delete();
  } catch {
    // ignore
  }
}

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}
