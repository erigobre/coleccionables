import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

export function CopyToast({ message }: { message: string | null }) {
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', bottom: insets.bottom + 96, left: 0, right: 0, alignItems: 'center' }}
    >
      <View style={{ backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
        <Text style={{ color: colors.background, fontSize: 12, fontWeight: '700' }}>{message}</Text>
      </View>
    </View>
  );
}
