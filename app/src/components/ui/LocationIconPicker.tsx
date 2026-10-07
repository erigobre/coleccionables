import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { LOCATION_ICON_OPTIONS, type LocationIconKey } from '../../lib/locations';
import { colors } from '../../theme/tokens';

// Cuadrícula de iconos fijos para elegir el de una ubicación.
export function LocationIconPicker({
  value,
  onChange,
}: {
  value: LocationIconKey;
  onChange: (key: LocationIconKey) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm text-textMuted">Icono</Text>
      <View className="flex-row flex-wrap gap-2">
        {LOCATION_ICON_OPTIONS.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              onPress={() => onChange(option.key)}
              accessibilityLabel={option.label}
              className={`h-14 w-14 items-center justify-center rounded-2xl border ${
                selected ? 'border-primary bg-primary' : 'border-border bg-surfaceElevated'
              }`}
            >
              <Ionicons name={option.key} size={24} color={selected ? colors.primaryText : colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
