import { Text, View } from 'react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { Screen } from '../../components/ui/Screen';

export default function ColeccionesScreen() {
  return (
    <Screen>
      <View className="mb-2">
        <Text className="text-2xl font-bold text-text">Colecciones</Text>
      </View>
      <EmptyState
        icon="albums-outline"
        title="Próximamente"
        description="Aquí verás tus colecciones en formato grid, con las colecciones por defecto ya creadas para ti."
      />
    </Screen>
  );
}
