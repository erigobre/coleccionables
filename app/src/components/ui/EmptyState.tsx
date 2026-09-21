import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '../../theme/tokens';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="mt-20 items-center px-6">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primaryMuted">
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text className="mb-1 text-center text-lg font-semibold text-text">{title}</Text>
      <Text className="text-center text-sm text-textMuted">{description}</Text>
    </View>
  );
}
