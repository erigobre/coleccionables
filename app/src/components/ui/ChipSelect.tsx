import { Pressable, Text, View } from 'react-native';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipSelectProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function ChipSelect<T extends string>({ label, options, value, onChange, error }: ChipSelectProps<T>) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-textSecondary">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`rounded-full border px-3 py-2 ${
              value === option.value ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'
            }`}
          >
            <Text className={`text-sm ${value === option.value ? 'text-primary' : 'text-textMuted'}`}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
