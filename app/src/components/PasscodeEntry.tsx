import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import type { PinMode } from '../lib/app-lock';
import { colors } from '../theme/tokens';
import { TextField } from './ui/TextField';

const NUMERIC_LENGTH: Record<'4' | '6', number> = { '4': 4, '6': 6 };
const ALPHANUMERIC_MIN_LENGTH = 4;

interface PasscodeEntryProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  mode: PinMode;
  onSubmit: (code: string) => void;
  optionsLabel?: string;
  onOptionsPress?: () => void;
  onBiometricPress?: () => void;
  footer?: ReactNode;
}

// Pantalla al estilo Passcode Lock de iOS: sin teclado propio — el teclado
// numérico/alfanumérico es el del sistema, atrapado en un TextInput invisible
// detrás de los puntos indicadores. Con un código numérico completo (4 o 6
// dígitos) se envía solo, sin botón "Continuar".
export function PasscodeEntry({
  title,
  subtitle,
  error,
  mode,
  onSubmit,
  optionsLabel,
  onOptionsPress,
  onBiometricPress,
  footer,
}: PasscodeEntryProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const isAlphanumeric = mode === 'alphanumeric';
  const length = isAlphanumeric ? undefined : NUMERIC_LENGTH[mode];

  useEffect(() => {
    if (!error) return;
    setValue('');
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [error, shake]);

  const onChangeNumeric = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setValue(digits);
    if (length && digits.length === length) {
      // Pequeña pausa para que se vea lleno el último punto antes de
      // procesar, igual que el Passcode Lock nativo.
      setTimeout(() => {
        onSubmit(digits);
        setValue('');
      }, 120);
    }
  };

  const onSubmitAlphanumeric = () => {
    if (value.trim().length < ALPHANUMERIC_MIN_LENGTH) return;
    onSubmit(value);
    setValue('');
  };

  const translateX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-10, 0, 10] });

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text allowFontScaling={false} className="mb-2 font-display text-lg uppercase text-text">
        {title}
      </Text>
      {subtitle ? <Text className="mb-6 text-center text-sm text-textMuted">{subtitle}</Text> : null}

      {isAlphanumeric ? (
        <View className="w-full max-w-[280px]">
          <TextField
            label="Código"
            value={value}
            onChangeText={setValue}
            autoFocus
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={onSubmitAlphanumeric}
          />
        </View>
      ) : (
        <Pressable onPress={() => inputRef.current?.focus()}>
          <Animated.View style={{ transform: [{ translateX }] }} className="flex-row gap-3">
            {Array.from({ length: length ?? 0 }).map((_, i) => (
              <View
                key={i}
                className={`h-3.5 w-3.5 rounded-full ${
                  i < value.length ? 'bg-primary' : 'border border-border bg-transparent'
                }`}
              />
            ))}
          </Animated.View>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeNumeric}
            keyboardType="number-pad"
            maxLength={length}
            autoFocus
            caretHidden
            style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
          />
        </Pressable>
      )}

      {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}

      <View className="mt-8 items-center gap-4">
        {onBiometricPress ? (
          <Pressable onPress={onBiometricPress} className="h-12 w-12 items-center justify-center rounded-full">
            <Ionicons name="finger-print-outline" size={26} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {optionsLabel && onOptionsPress ? (
          <Pressable onPress={onOptionsPress}>
            <Text className="text-sm font-medium" style={{ color: colors.secondary }}>
              {optionsLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {footer ? <View className="mt-8 w-full max-w-[280px]">{footer}</View> : null}
    </View>
  );
}
