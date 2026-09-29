import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View, type NativeSyntheticEvent, type TextInputContentSizeChangeEventData, type TextInputProps } from 'react-native';
import { colors } from '../../theme/tokens';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // Crece hacia abajo con el contenido en lugar de recortar/desbordar el texto,
  // como un <textarea> de HTML — pensado para campos de una sola línea que a
  // veces reciben texto largo (ej. nombre del objeto).
  autoExpand?: boolean;
}

const MIN_HEIGHT = 56;

export function TextField({ label, error, autoExpand, style, secureTextEntry, ...inputProps }: TextFieldProps) {
  const [height, setHeight] = useState(MIN_HEIGHT);
  // Solo para contraseñas: alterna a texto plano para revisar lo que se escribió.
  const [revealed, setRevealed] = useState(false);

  const onContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    setHeight(Math.max(MIN_HEIGHT, e.nativeEvent.contentSize.height + 20));
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-textSecondary">{label}</Text>
      <View className="relative">
        <TextInput
          className={`rounded-md border bg-surfaceElevated px-4 text-base text-text ${
            autoExpand ? 'py-4' : 'h-14'
          } ${error ? 'border-danger' : 'border-border'}`}
          style={[
            autoExpand ? { height, textAlignVertical: 'top' as const } : null,
            secureTextEntry ? { paddingRight: 44 } : null,
            style,
          ]}
          placeholderTextColor="#A79FC4"
          autoCapitalize="none"
          autoCorrect={false}
          multiline={autoExpand}
          onContentSizeChange={autoExpand ? onContentSizeChange : undefined}
          secureTextEntry={secureTextEntry && !revealed}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((prev) => !prev)}
            hitSlop={8}
            className="absolute right-0 top-0 h-14 w-11 items-center justify-center"
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
