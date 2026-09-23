import { Stack } from 'expo-router';
import { CloseHeaderButton } from '../../../components/CloseHeaderButton';
import { colors } from '../../../theme/tokens';

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
      {/* Se puede llegar aquí recién creado el objeto desde /new (fuera de este
          stack, vía replace), sin historial local que dé un botón "Atrás" por
          defecto — este botón siempre puede volver al catálogo. */}
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Objeto',
          headerLeft: () => <CloseHeaderButton variant="plain" fallbackTo="/(tabs)/objetos" />,
        }}
      />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar objeto' }} />
      <Stack.Screen name="[id]/ubicacion" options={{ title: 'Cambiar ubicación', presentation: 'modal' }} />
      <Stack.Screen name="[id]/vender" options={{ title: 'Transferir objeto', presentation: 'modal' }} />
      <Stack.Screen name="transferencias" options={{ title: 'Transferencias' }} />
    </Stack>
  );
}
