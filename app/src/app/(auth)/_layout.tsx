import { Stack } from 'expo-router';
import { colors } from '../../theme/tokens';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="bienvenida" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="olvide-contrasena" />
      <Stack.Screen name="restablecer-contrasena" />
    </Stack>
  );
}
