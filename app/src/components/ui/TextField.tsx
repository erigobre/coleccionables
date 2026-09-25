import { useState } from 'react';
import { Text, TextInput, View, type NativeSyntheticEvent, type TextInputContentSizeChangeEventData, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // Crece hacia abajo con el contenido en lugar de recortar/desbordar el texto,
  // como un <textarea> de HTML — pensado para campos de una sola línea que a
  // veces reciben texto largo (ej. nombre del objeto).
  autoExpand?: boolean;
}

const MIN_HEIGHT = 56;

export function TextField({ label, error, autoExpand, style, ...inputProps }: TextFieldProps) {
  const [height, setHeight] = useState(MIN_HEIGHT);

  const onContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    setHeight(Math.max(MIN_HEIGHT, e.nativeEvent.contentSize.height + 20));
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-textSecondary">{label}</Text>
      <TextInput
        className={`rounded-md border bg-surfaceElevated px-4 text-base text-text ${
          autoExpand ? 'py-4' : 'h-14'
        } ${error ? 'border-danger' : 'border-border'}`}
        style={autoExpand ? [{ height, textAlignVertical: 'top' }, style] : style}
        placeholderTextColor="#A79FC4"
        autoCapitalize="none"
        autoCorrect={false}
        multiline={autoExpand}
        onContentSizeChange={autoExpand ? onContentSizeChange : undefined}
        {...inputProps}
      />
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
