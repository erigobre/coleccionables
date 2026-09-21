import { Stack } from 'expo-router';
import { colors } from '../../../theme/tokens';

export default function ColeccionesStackLayout() {
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
      <Stack.Screen name="manage" options={{ title: 'Gestionar colecciones' }} />
    </Stack>
  );
}
