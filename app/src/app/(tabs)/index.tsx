import { Text, View } from 'react-native';
import { Screen } from '../../components/ui/Screen';
import { useAuth } from '../../context/auth-context';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-surface p-4">
      <Text className="text-2xl font-bold text-text">{value}</Text>
      <Text className="mt-1 text-xs text-textMuted">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Hola{firstName ? `, ${firstName}` : ''} 👋</Text>
      <Text className="mt-1 text-sm text-textMuted">Este es el resumen de tu colección</Text>

      <View className="mt-6 flex-row gap-3">
        <StatCard label="Objetos totales" value={0} />
        <StatCard label="En wishlist" value={0} />
      </View>

      <View className="mt-8 rounded-lg border border-dashed border-border bg-surface p-6">
        <Text className="text-sm text-textMuted">
          Aún no tienes objetos registrados. Cuando agregues ubicaciones y objetos, sus estadísticas y
          sugerencias aparecerán aquí.
        </Text>
      </View>
    </Screen>
  );
}
