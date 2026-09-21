import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors } from '../../../theme/tokens';
import { useAuth } from '../../../context/auth-context';

function MenuRow({
  icon,
  label,
  href,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: string;
}) {
  const content = (
    <View className="flex-row items-center gap-3 border-b border-border py-4">
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text className="flex-1 text-base text-text">{label}</Text>
      {href ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );

  if (!href) return content;
  return (
    <Link href={href} asChild>
      <Pressable>{content}</Pressable>
    </Link>
  );
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <View className="mb-8 items-center">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-surfaceElevated">
          <Ionicons name="person" size={36} color={colors.secondary} />
        </View>
        <Text className="font-body-bold text-lg text-text">{user?.name}</Text>
        <Text className="text-sm text-textMuted">{user?.email}</Text>
      </View>

      <View className="mb-8 rounded-lg border border-border bg-surface px-4">
        <MenuRow icon="location-outline" label="Ubicaciones" href="/(tabs)/perfil/ubicaciones" />
        <MenuRow icon="calendar-outline" label="Temporadas" href="/(tabs)/perfil/temporadas" />
        <MenuRow icon="stats-chart-outline" label="Estadísticas" />
        <MenuRow icon="settings-outline" label="Ajustes" />
      </View>

      <Button label="Cerrar sesión" variant="ghost" onPress={logout} />
    </Screen>
  );
}
