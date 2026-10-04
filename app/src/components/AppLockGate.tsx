import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/auth-context';
import { hasPin, isBiometricEnabled, verifyPin } from '../lib/app-lock';
import { freshInstallReady } from '../lib/fresh-install';
import { PinPad } from './PinPad';

export function AppLockGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const biometricTried = useRef(false);
  // El propio prompt nativo de Face ID/huella dispara un ciclo de AppState
  // (active -> background/inactive -> active) al mostrarse y cerrarse. Sin
  // este guard, el listener de abajo interpretaba ese regreso a "active"
  // como "la app volvió de segundo plano" y volvía a bloquear justo después
  // de desbloquear con biometría, entrando en un loop infinito (reportado
  // por el usuario 2026-10-02: se desbloqueaba y ~1.5s después se bloqueaba
  // otra vez, una y otra vez).
  const authenticating = useRef(false);

  useEffect(() => {
    freshInstallReady()
      .then(() => hasPin())
      .then((has) => {
        if (has) setLocked(true);
      });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appState.current;
      appState.current = next;
      if (next === 'active' && prev !== 'active' && !authenticating.current) {
        const has = await hasPin();
        if (has) {
          biometricTried.current = false;
          setLocked(true);
        }
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!user) setLocked(false);
  }, [user]);

  const tryBiometric = async () => {
    if (biometricTried.current) return;
    biometricTried.current = true;
    const enabled = await isBiometricEnabled();
    if (!enabled) return;
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = compatible && (await LocalAuthentication.isEnrolledAsync());
    if (!enrolled) return;
    authenticating.current = true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquea Frikidex' });
    if (result.success) setLocked(false);
    // Margen tras el await: el evento de AppState que dispara el cierre del
    // prompt puede llegar un instante después de que la promesa resuelve.
    setTimeout(() => {
      authenticating.current = false;
    }, 500);
  };

  useEffect(() => {
    if (locked) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const onSubmitPin = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      setError(null);
      setLocked(false);
    } else {
      setError('PIN incorrecto');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked ? (
        <View style={StyleSheet.absoluteFill}>
          <PinPad
            title="App bloqueada"
            subtitle="Ingresa tu PIN para continuar"
            error={error}
            onSubmit={onSubmitPin}
            extraKey={{ icon: 'finger-print-outline', onPress: tryBiometric }}
          />
        </View>
      ) : null}
    </View>
  );
}
