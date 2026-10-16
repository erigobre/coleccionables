import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'frikidex.appLock.pin';
const PIN_MODE_KEY = 'frikidex.appLock.pinMode';
const BIOMETRIC_ENABLED_KEY = 'frikidex.appLock.biometricEnabled';

// Formato del código: numérico de 6 (default, como el Passcode Lock de iOS)
// o 4 dígitos, o alfanumérico libre. Elegible desde "Opciones de código" al
// crear/cambiar el código (app/src/app/(tabs)/perfil/ajustes/pin.tsx).
export type PinMode = '4' | '6' | 'alphanumeric';
const DEFAULT_PIN_MODE: PinMode = '6';

export async function getPinMode(): Promise<PinMode> {
  const value = await SecureStore.getItemAsync(PIN_MODE_KEY);
  return value === '4' || value === 'alphanumeric' ? value : DEFAULT_PIN_MODE;
}

export async function setPinMode(mode: PinMode): Promise<void> {
  await SecureStore.setItemAsync(PIN_MODE_KEY, mode);
}

export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function getPin(): Promise<string | null> {
  return SecureStore.getItemAsync(PIN_KEY);
}

export async function hasPin(): Promise<boolean> {
  const pin = await getPin();
  return pin != null;
}

export async function verifyPin(candidate: string): Promise<boolean> {
  const pin = await getPin();
  return pin != null && pin === candidate;
}

export async function clearPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_KEY),
    SecureStore.deleteItemAsync(PIN_MODE_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
  ]);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, '1');
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === '1';
}
