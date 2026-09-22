import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '../../../theme/tokens';

// Estas dos pantallas se abren desde otros tabs (Home, Wishlist) con router.push,
// así que el stack de "objetos" puede arrancar directo en ellas sin historial
// previo: el back automático de native-stack no aparece. Se agrega un botón
// propio que vuelve atrás si hay historial, o manda a Home si no lo hay.
function CloseHeaderButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      hitSlop={12}
      className="ml-1 h-9 w-9 items-center justify-center rounded-full bg-background/40"
    >
      <Ionicons name="chevron-back" size={22} color={colors.white} />
    </Pressable>
  );
}

export default function ObjetosStackLayout() {
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
      <Stack.Screen
        name="captura"
        options={{
          title: 'Nuevo objeto',
          headerTransparent: true,
          headerTintColor: colors.white,
          headerTitle: '',
          headerLeft: () => <CloseHeaderButton />,
        }}
      />
      <Stack.Screen
        name="ya-lo-tengo"
        options={{
          title: '¿Ya lo tengo?',
          headerTransparent: true,
          headerTintColor: colors.white,
          headerTitle: '',
          headerLeft: () => <CloseHeaderButton />,
        }}
      />
      <Stack.Screen name="new" options={{ title: 'Nuevo objeto' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Objeto' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar objeto' }} />
      <Stack.Screen name="[id]/ubicacion" options={{ title: 'Cambiar ubicación', presentation: 'modal' }} />
      <Stack.Screen name="[id]/vender" options={{ title: 'Vender objeto', presentation: 'modal' }} />
      <Stack.Screen name="transferencias" options={{ title: 'Transferencias' }} />
    </Stack>
  );
}
