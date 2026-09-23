import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
}

export function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  // En iOS el picker "spinner" no trae un botón de confirmar propio del sistema:
  // sin este borrador, cada vuelta de la rueda confirmaba la fecha de inmediato
  // y no había forma de cerrar el picker una vez abierto.
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-textSecondary">{label}</Text>
      <Pressable
        onPress={() => {
          setDraft(value ?? new Date());
          setOpen(true);
        }}
        className="h-14 justify-center rounded-md border border-border bg-surfaceElevated px-4"
      >
        <Text className={value ? 'text-base text-text' : 'text-base text-textMuted'}>
          {value ? formatDate(value) : 'Selecciona una fecha'}
        </Text>
      </Pressable>
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setOpen(false);
            if (event.type === 'set' && selected) onChange(selected);
          }}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <View className="mt-2 rounded-md border border-border bg-surfaceElevated">
          <DateTimePicker value={draft} mode="date" display="spinner" onChange={(_, selected) => selected && setDraft(selected)} />
          <View className="flex-row justify-end gap-4 border-t border-border px-4 py-3">
            <Pressable onPress={() => setOpen(false)}>
              <Text className="text-sm font-medium text-textMuted">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                Confirmar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
