import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/auth-context';
import { hasPin, isBiometricEnabled, verifyPin } from '../lib/app-lock';
import { freshInstallReady } from '../lib/fresh-install';
import { PinPad } from './PinPad';

export function AppLockGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
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
  // El listener de AppState se suscribe una sola vez (ver abajo); sin un ref
  // quedaría cerrado sobre el `user` de ese primer render (siempre null,
  // porque isLoading arranca en true) y nunca vería una sesión iniciada después.
  const userRef = useRef(user);
  userRef.current = user;

  // Sin sesión no hay nada que proteger: si el chequeo corriera igual tras un
  // cierre de sesión, pediría biométrico/PIN para de todos modos acabar en
  // login (Stack.Protected ya redirige ahí sin `user`) — pedía una
  // autenticación que no llevaba a ningún lado (reportado por el usuario
  // 2026-10-10).
  useEffect(() => {
    if (isLoading || !user) return;
    freshInstallReady()
      .then(() => hasPin())
      .then((has) => {
        if (has) setLocked(true);
      });
  }, [isLoading, user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appState.current;
      appState.current = next;
      // Solo se bloquea al volver de background. El prompt de Face ID/huella
      // pasa por "inactive" y regresa a "active", y no debe contar como regreso
      // de segundo plano (ahí estaba el loop: el guard por tiempo fallaba si el
      // evento llegaba después de los 500 ms).
      if (next === 'active' && prev === 'background' && !authenticating.current && userRef.current) {
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
