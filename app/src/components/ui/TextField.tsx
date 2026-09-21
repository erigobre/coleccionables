import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-textSecondary">{label}</Text>
      <TextInput
        className={`h-14 rounded-md border bg-surfaceElevated px-4 text-base text-text ${
          error ? 'border-danger' : 'border-border'
        }`}
        placeholderTextColor="#A79FC4"
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
