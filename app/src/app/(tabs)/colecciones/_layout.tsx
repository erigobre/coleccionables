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
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="manage" options={{ title: 'Gestionar colecciones' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Colección' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar colección' }} />
      <Stack.Screen name="[id]/ubicacion" options={{ title: 'Reubicar colección', presentation: 'modal' }} />
      <Stack.Screen name="[id]/regresar" options={{ title: 'Ubicación permanente' }} />
    </Stack>
  );
}
