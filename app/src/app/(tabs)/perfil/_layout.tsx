import { Stack } from 'expo-router';
import { colors } from '../../../theme/tokens';

export default function PerfilStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ubicaciones/index" options={{ title: 'Ubicaciones' }} />
      <Stack.Screen name="ubicaciones/[id]" options={{ title: 'Ubicación' }} />
      <Stack.Screen name="temporadas/index" options={{ title: 'Temporadas' }} />
      <Stack.Screen name="temporadas/[id]" options={{ title: 'Temporada' }} />
    </Stack>
  );
}
