import { Stack } from 'expo-router';
import { CloseHeaderButton } from '../../../components/CloseHeaderButton';
import { colors } from '../../../theme/tokens';

// Sin esto, entrar a un objeto desde otra pestaña (Home, Colecciones) deja el
// detalle como única pantalla del stack: "atrás" sale a Home y el stack queda
// con el detalle encima, así que al volver a Objetos aparece ese detalle y no
// la lista. Con `index` como base, "atrás" siempre regresa a la lista.
export const unstable_settings = {
  initialRouteName: 'index',
};

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
      {/* "modal" (pageSheet), no fullScreenModal: fullScreenModal desactiva por
          completo el gesto nativo de swipe-down en iOS, y como la animación
          de envío no se está renderizando (bug sin resolver, 2026-10-01), eso
          dejaba al usuario sin ninguna forma de salir salvo cerrar la app.
          Con pageSheet al menos el swipe-down sigue intentable. */}
      <Stack.Screen name="[id]/vender" options={{ title: 'Transferir objeto', presentation: 'modal' }} />
      {/* Se puede abrir directo desde una notificación (cold start, sin historial
          dentro de este stack): sin este botón no hay forma de salir de la pantalla. */}
      <Stack.Screen
        name="transferencias"
        options={{
          title: 'Transferencias',
          headerLeft: () => <CloseHeaderButton variant="plain" fallbackTo="/(tabs)/objetos" />,
        }}
      />
    </Stack>
  );
}
