import { Bungee_400Regular, useFonts as useBungeeFont } from '@expo-google-fonts/bungee';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSansFont } from '@expo-google-fonts/dm-sans';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../../global.css';
import { CloseHeaderButton } from '../components/CloseHeaderButton';
import { AuthProvider, useAuth } from '../context/auth-context';
import { FtProvider } from '../context/ft-context';
import { colors } from '../theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Muestra la notificación como alerta también con la app en primer plano
// (por defecto expo-notifications la silencia si la app está abierta).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Navega según el tipo de notificación al tocarla (app abierta, en background
// o cerrada — el listener cubre los tres casos por igual).
function useNotificationNavigation() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string; seasonId?: string } | undefined;
      if (data?.type === 'transfer') {
        router.push('/(tabs)/objetos/transferencias');
      } else if (data?.type === 'season' && data.seasonId) {
        router.push(`/(tabs)/perfil/temporadas/${data.seasonId}`);
      }
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [bungeeLoaded] = useBungeeFont({ Bungee_400Regular });
  const [dmSansLoaded] = useDMSansFont({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const fontsLoaded = bungeeLoaded && dmSansLoaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FtProvider>
            <RootNavigator fontsLoaded={fontsLoaded} />
            <StatusBar style="light" />
          </FtProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isLoading, user } = useAuth();
  const ready = fontsLoaded && !isLoading;

  useNotificationNavigation();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        {/* Modales de pantalla completa, fuera de cualquier tab: así entrar a la
            cámara desde Home/Wishlist/Objetos nunca deja a un tab con su stack
            interno "atorado" en la cámara, ni la barra de tabs queda visible
            encima (no forman parte de ningún tab). */}
        <Stack.Screen
          name="captura"
          options={{
            presentation: 'fullScreenModal',
            headerShown: true,
            headerTransparent: true,
            headerTintColor: colors.white,
            headerTitle: '',
            headerLeft: () => <CloseHeaderButton />,
          }}
        />
        <Stack.Screen
          name="ya-lo-tengo"
          options={{
            presentation: 'fullScreenModal',
            headerShown: true,
            headerTransparent: true,
            headerTintColor: colors.white,
            headerTitle: '',
            headerLeft: () => <CloseHeaderButton />,
          }}
        />
        {/* El formulario de alta también vive fuera de los tabs: llega siempre
            por un replace desde captura/ya-lo-tengo, así que al ser hermano de
            (tabs) en este mismo stack conserva el historial de vuelta (el
            "atrás" cae en la pantalla desde la que se abrió la cámara). */}
        <Stack.Screen
          name="new"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            headerTitle: 'Nuevo objeto',
            headerLeft: () => <CloseHeaderButton variant="plain" />,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
