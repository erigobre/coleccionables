import { Text, View } from 'react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { Screen } from '../../components/ui/Screen';

export default function WishlistScreen() {
  return (
    <Screen>
      <View className="mb-2">
        <Text className="font-display text-[22px] uppercase tracking-wide text-text">Wishlist</Text>
      </View>
      <EmptyState
        icon="heart-outline"
        title="Tu wishlist está vacía"
        description="Cuando el flujo “¿ya lo tengo?” detecte algo que no tienes, podrás mandarlo aquí en un toque."
      />
    </Screen>
  );
}
