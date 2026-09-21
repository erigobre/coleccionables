import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { colors } from '../../theme/tokens';
import { useAuth } from '../../context/auth-context';

function MenuRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-border py-4">
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text className="text-base text-text">{label}</Text>
    </View>
  );
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <View className="mb-8 items-center">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primaryMuted">
          <Ionicons name="person" size={36} color={colors.primary} />
        </View>
        <Text className="text-lg font-semibold text-text">{user?.name}</Text>
        <Text className="text-sm text-textMuted">{user?.email}</Text>
      </View>

      <View className="mb-8 rounded-lg border border-border bg-surface px-4">
        <MenuRow icon="location-outline" label="Ubicaciones" />
        <MenuRow icon="calendar-outline" label="Temporadas" />
        <MenuRow icon="stats-chart-outline" label="Estadísticas" />
        <MenuRow icon="settings-outline" label="Ajustes" />
      </View>

      <Button label="Cerrar sesión" variant="secondary" onPress={logout} />
    </Screen>
  );
}
