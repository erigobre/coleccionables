import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

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

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-textSecondary">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-14 justify-center rounded-md border border-border bg-surfaceElevated px-4"
      >
        <Text className={value ? 'text-base text-text' : 'text-base text-textMuted'}>
          {value ? formatDate(value) : 'Selecciona una fecha'}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            setOpen(Platform.OS === 'ios');
            if (event.type === 'dismissed') {
              setOpen(false);
              return;
            }
            if (selected) onChange(selected);
            if (Platform.OS === 'android') setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
