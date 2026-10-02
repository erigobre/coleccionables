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
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ubicaciones/index" options={{ title: 'Ubicaciones' }} />
      <Stack.Screen name="ubicaciones/[id]" options={{ title: 'Ubicación' }} />
      <Stack.Screen name="ubicaciones/escanear" options={{ title: 'Escanear QR' }} />
      <Stack.Screen name="temporadas/index" options={{ title: 'Temporadas' }} />
      <Stack.Screen name="temporadas/[id]" options={{ title: 'Temporada' }} />
      <Stack.Screen name="invitar" options={{ title: 'Invitar amigos' }} />
      <Stack.Screen name="ajustes/index" options={{ title: 'Ajustes' }} />
      <Stack.Screen name="ajustes/usuario" options={{ title: '@usuario' }} />
      <Stack.Screen name="ajustes/contrasena" options={{ title: 'Contraseña' }} />
      <Stack.Screen name="ajustes/correo" options={{ title: 'Correo' }} />
      <Stack.Screen name="ajustes/pin" options={{ title: 'PIN y bloqueo' }} />
      <Stack.Screen name="ajustes/eliminar-cuenta" options={{ title: 'Eliminar cuenta' }} />
      <Stack.Screen name="wallet/index" options={{ title: 'FrikiTokens' }} />
      <Stack.Screen name="wallet/suscripcion" options={{ title: 'Suscripción' }} />
      <Stack.Screen name="wallet/familiares" options={{ title: 'Familiares' }} />
      <Stack.Screen name="wallet/invitaciones" options={{ title: 'Invitaciones' }} />
      <Stack.Screen name="wallet/historial" options={{ title: 'Historial' }} />
    </Stack>
  );
}
