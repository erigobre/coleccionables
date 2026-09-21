import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors } from '../../theme/tokens';

export default function ObjetosScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120, paddingHorizontal: 20 }}
      >
        <Text className="text-2xl font-bold text-text">Objetos</Text>
        <EmptyState
          icon="cube-outline"
          title="Todavía no hay objetos"
          description="Usa el botón + para tomarle una foto a tu primer objeto y dejar que la IA lo identifique."
        />
      </ScrollView>

      <Pressable
        className="absolute h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        style={{ right: 20, bottom: insets.bottom + 96 }}
      >
        <Ionicons name="add" size={30} color={colors.surface} />
      </Pressable>
    </View>
  );
}
