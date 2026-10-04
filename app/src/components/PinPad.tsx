import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

const MIN_LENGTH = 4;
const MAX_LENGTH = 6;

interface PinPadProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  onSubmit: (pin: string) => void;
  extraKey?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void };
}

// Filas fijas de 3 columnas (teclado telefónico clásico: 1-2-3/4-5-6/7-8-9,
// y al fondo extra-0-borrar). Antes era un `flex-wrap` con `max-w-[280px]`
// que, apenas esa clase arbitraria no se aplicaba en el ancho disponible,
// caía a 4 por fila en vez de 3 — reportado como "no tan intuitivo" por el
// usuario 2026-10-02. Con filas explícitas no depende de que el wrap calce.
const ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function PinPad({ title, subtitle, error, onSubmit, extraKey }: PinPadProps) {
  const [value, setValue] = useState('');
  const canConfirm = value.length >= MIN_LENGTH;

  const onDigit = (d: string) => {
    if (value.length >= MAX_LENGTH) return;
    setValue((prev) => prev + d);
  };
  const onBackspace = () => setValue((prev) => prev.slice(0, -1));
  const onConfirm = () => {
    if (!canConfirm) return;
    onSubmit(value);
    setValue('');
  };

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text allowFontScaling={false} className="mb-2 font-display text-lg uppercase text-text">
        {title}
      </Text>
      {subtitle ? <Text className="mb-6 text-center text-sm text-textMuted">{subtitle}</Text> : null}

      <View className="mb-8 flex-row gap-3">
        {Array.from({ length: MAX_LENGTH }).map((_, i) => (
          <View
            key={i}
            className={`h-3.5 w-3.5 rounded-full ${i < value.length ? 'bg-primary' : 'border border-border bg-transparent'}`}
          />
        ))}
      </View>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="w-full max-w-[280px] gap-4">
        {ROWS.map((row) => (
          <View key={row.join('')} className="flex-row justify-between">
            {row.map((d) => (
              <Pressable
                key={d}
                onPress={() => onDigit(d)}
                className="h-16 w-16 items-center justify-center rounded-full bg-surfaceElevated"
              >
                <Text className="font-display text-xl text-text">{d}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View className="flex-row justify-between">
          {extraKey ? (
            <Pressable onPress={extraKey.onPress} className="h-16 w-16 items-center justify-center rounded-full">
              <Ionicons name={extraKey.icon} size={24} color={colors.textMuted} />
            </Pressable>
          ) : (
            <View className="h-16 w-16" />
          )}
          <Pressable
            onPress={() => onDigit('0')}
            className="h-16 w-16 items-center justify-center rounded-full bg-surfaceElevated"
          >
            <Text className="font-display text-xl text-text">0</Text>
          </Pressable>
          <Pressable onPress={onBackspace} className="h-16 w-16 items-center justify-center rounded-full">
            <Ionicons name="backspace-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onConfirm}
        disabled={!canConfirm}
        className={`mt-8 h-12 w-full max-w-[280px] items-center justify-center rounded-md ${
          canConfirm ? 'bg-primary' : 'bg-disabledBg'
        }`}
      >
        <Text className={`font-display uppercase ${canConfirm ? 'text-primaryText' : 'text-disabledText'}`}>
          Continuar
        </Text>
      </Pressable>
    </View>
  );
}
