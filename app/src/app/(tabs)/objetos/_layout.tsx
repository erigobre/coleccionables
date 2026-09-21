import { Stack } from 'expo-router';
import { colors } from '../../../theme/tokens';

export default function ObjetosStackLayout() {
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
      <Stack.Screen name="captura" options={{ title: 'Nuevo objeto', headerTransparent: true, headerTintColor: colors.white, headerTitle: '' }} />
      <Stack.Screen name="new" options={{ title: 'Nuevo objeto' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Objeto' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar objeto' }} />
      <Stack.Screen name="[id]/ubicacion" options={{ title: 'Cambiar ubicación', presentation: 'modal' }} />
    </Stack>
  );
}
