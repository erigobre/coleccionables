import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { PasscodeEntry } from '../../../../components/PasscodeEntry';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import {
  clearPin,
  getPinMode,
  hasPin,
  isBiometricEnabled,
  savePin,
  setBiometricEnabled,
  setPinMode,
  verifyPin,
  type PinMode,
} from '../../../../lib/app-lock';
import { colors } from '../../../../theme/tokens';

type Step = 'idle' | 'verify-remove' | 'verify-change' | 'enter-new' | 'confirm-new';

const MODE_LABEL: Record<PinMode, string> = {
  '6': 'Código numérico de 6 dígitos',
  '4': 'Código numérico de 4 dígitos',
  alphanumeric: 'Código alfanumérico personalizado',
};

export default function AppLockScreen() {
  const [pinSet, setPinSet] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  // `savedMode`: formato del código ya guardado (para las pantallas de
  // verificación). `newMode`: formato en edición mientras se crea/cambia el
  // código, elegible desde "Opciones de código" — empieza igual al guardado.
  const [savedMode, setSavedMode] = useState<PinMode>('6');
  const [newMode, setNewMode] = useState<PinMode>('6');
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    hasPin().then(setPinSet);
    getPinMode().then(setSavedMode);
    isBiometricEnabled().then(setBiometricOn);
    LocalAuthentication.hasHardwareAsync().then(async (compatible) => {
      const enrolled = compatible && (await LocalAuthentication.isEnrolledAsync());
      setBiometricAvailable(enrolled);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const reset = () => {
    setStep('idle');
    setFirstEntry('');
    setError(null);
  };

  const startNewCode = () => {
    setNewMode(savedMode);
    setFirstEntry('');
    setError(null);
    setStep('enter-new');
  };

  const onEnterNew = (code: string) => {
    setFirstEntry(code);
    setError(null);
    setStep('confirm-new');
  };

  const onConfirmNew = async (code: string) => {
    if (code !== firstEntry) {
      setError('No coincide, intenta de nuevo');
      setFirstEntry('');
      setStep('enter-new');
      return;
    }
    await savePin(code);
    await setPinMode(newMode);
    load();
    reset();
  };

  const onVerifyForChange = async (code: string) => {
    const ok = await verifyPin(code);
    if (!ok) {
      setError('Código incorrecto');
      return;
    }
    startNewCode();
  };

  const onVerifyForRemove = async (code: string) => {
    const ok = await verifyPin(code);
    if (!ok) {
      setError('Código incorrecto');
      return;
    }
    await clearPin();
    load();
    reset();
  };

  const onToggleBiometric = async (value: boolean) => {
    await setBiometricEnabled(value);
    setBiometricOn(value);
  };

  const onPickMode = () => {
    const modes: PinMode[] = ['6', '4', 'alphanumeric'];
    Alert.alert('Opciones de código', 'Elige el formato de tu nuevo código. Tendrás que volver a escribirlo.', [
      ...modes.map((m) => ({
        text: MODE_LABEL[m] + (m === newMode ? ' ✓' : ''),
        onPress: () => {
          setNewMode(m);
          setFirstEntry('');
          setError(null);
          setStep('enter-new');
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  if (step !== 'idle') {
    const screens: Record<
      Exclude<Step, 'idle'>,
      { title: string; subtitle?: string; mode: PinMode; onSubmit: (code: string) => void; showOptions?: boolean }
    > = {
      'enter-new': { title: 'Elige tu código', subtitle: MODE_LABEL[newMode], mode: newMode, onSubmit: onEnterNew, showOptions: true },
      'confirm-new': { title: 'Repite tu código', mode: newMode, onSubmit: onConfirmNew },
      'verify-change': { title: 'Ingresa tu código actual', mode: savedMode, onSubmit: onVerifyForChange },
      'verify-remove': { title: 'Ingresa tu código actual', mode: savedMode, onSubmit: onVerifyForRemove },
    };
    const current = screens[step];
    return (
      <View className="flex-1">
        <PasscodeEntry
          title={current.title}
          subtitle={current.subtitle}
          mode={current.mode}
          error={error}
          onSubmit={current.onSubmit}
          optionsLabel={current.showOptions ? 'Opciones de código' : undefined}
          onOptionsPress={current.showOptions ? onPickMode : undefined}
          footer={<Button label="Cancelar" variant="ghost" onPress={reset} />}
        />
      </View>
    );
  }

  return (
    <Screen>
      <Text className="mb-6 text-sm text-textMuted">
        El código se guarda solo en este dispositivo y protege la app al volver de segundo plano. No reemplaza tu
        contraseña de la cuenta ni se comparte con el servidor.
      </Text>

      {pinSet ? (
        <View className="gap-3">
          <Text className="text-xs text-textMuted">Formato actual: {MODE_LABEL[savedMode]}</Text>
          {biometricAvailable ? (
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-base text-text">Face ID / huella</Text>
                <Text className="text-xs text-textMuted">Úsalo como alternativa rápida al código</Text>
              </View>
              <Switch value={biometricOn} onValueChange={onToggleBiometric} trackColor={{ true: colors.primary }} />
            </View>
          ) : null}
          <Button label="Cambiar código" variant="secondary" onPress={() => setStep('verify-change')} />
          <Button label="Quitar código" variant="destructive" onPress={() => setStep('verify-remove')} />
        </View>
      ) : (
        <Button label="Activar código" onPress={startNewCode} />
      )}
    </Screen>
  );
}
