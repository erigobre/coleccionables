import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiFetch } from './api';

const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

// Nunca debe romper login/arranque: si el usuario niega el permiso, no hay
// dispositivo físico (simulador) o falla la llamada, simplemente no se registra.
export async function registerPushToken(accessToken: string): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });

    await apiFetch('/notifications/push-tokens', {
      method: 'POST',
      body: { token, platform: Platform.OS },
      accessToken,
    });
  } catch {
    // Silencioso a propósito (ver comentario de la función).
  }
}

export async function unregisterPushToken(accessToken: string, token: string): Promise<void> {
  try {
    await apiFetch(`/notifications/push-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      accessToken,
    });
  } catch {
    // Silencioso: el logout no debe bloquearse por esto.
  }
}
