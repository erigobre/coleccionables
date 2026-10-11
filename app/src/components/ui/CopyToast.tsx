import { Text, View } from 'react-native';
import { colors } from '../../theme/tokens';

export function CopyToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: colors.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
        <Text style={{ color: colors.background, fontSize: 12, fontWeight: '700' }}>{message}</Text>
      </View>
    </View>
  );
}
