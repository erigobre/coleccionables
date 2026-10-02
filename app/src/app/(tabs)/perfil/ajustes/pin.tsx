import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { PinPad } from '../../../../components/PinPad';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import {
  clearPin,
  hasPin,
  isBiometricEnabled,
  savePin,
  setBiometricEnabled,
  verifyPin,
} from '../../../../lib/app-lock';
import { colors } from '../../../../theme/tokens';

type Step = 'idle' | 'verify-remove' | 'verify-change' | 'enter-new' | 'confirm-new';

export default function AppLockScreen() {
  const [pinSet, setPinSet] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [firstEntry, setFirstEntry] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    hasPin().then(setPinSet);
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

  const onEnterNew = (pin: string) => {
    setFirstEntry(pin);
    setError(null);
    setStep('confirm-new');
  };

  const onConfirmNew = async (pin: string) => {
    if (pin !== firstEntry) {
      setError('No coincide, intenta de nuevo');
      setFirstEntry('');
      setStep('enter-new');
      return;
    }
    await savePin(pin);
    load();
    reset();
  };

  const onVerifyForChange = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (!ok) {
      setError('PIN incorrecto');
      return;
    }
    setError(null);
    setFirstEntry('');
    setStep('enter-new');
  };

  const onVerifyForRemove = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (!ok) {
      setError('PIN incorrecto');
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

  if (step !== 'idle') {
    const screens: Record<Exclude<Step, 'idle'>, { title: string; subtitle?: string; onSubmit: (pin: string) => void }> = {
      'enter-new': { title: 'Elige tu PIN', subtitle: '4 a 6 dígitos', onSubmit: onEnterNew },
      'confirm-new': { title: 'Repite tu PIN', onSubmit: onConfirmNew },
      'verify-change': { title: 'Ingresa tu PIN actual', onSubmit: onVerifyForChange },
      'verify-remove': { title: 'Ingresa tu PIN actual', onSubmit: onVerifyForRemove },
    };
    const current = screens[step];
    return (
      <View className="flex-1">
        <PinPad title={current.title} subtitle={current.subtitle} error={error} onSubmit={current.onSubmit} />
        <View className="px-8 pb-8">
          <Button label="Cancelar" variant="ghost" onPress={reset} />
        </View>
      </View>
    );
  }

  return (
    <Screen>
      <Text className="mb-6 text-sm text-textMuted">
        El PIN se guarda solo en este dispositivo y protege la app al volver de segundo plano. No reemplaza tu
        contraseña de la cuenta ni se comparte con el servidor.
      </Text>

      {pinSet ? (
        <View className="gap-3">
          {biometricAvailable ? (
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-base text-text">Face ID / huella</Text>
                <Text className="text-xs text-textMuted">Úsalo como alternativa rápida al PIN</Text>
              </View>
              <Switch value={biometricOn} onValueChange={onToggleBiometric} trackColor={{ true: colors.primary }} />
            </View>
          ) : null}
          <Button label="Cambiar PIN" variant="secondary" onPress={() => setStep('verify-change')} />
          <Button label="Quitar PIN" variant="destructive" onPress={() => setStep('verify-remove')} />
        </View>
      ) : (
        <Button label="Activar PIN" onPress={() => setStep('enter-new')} />
      )}
    </Screen>
  );
}
