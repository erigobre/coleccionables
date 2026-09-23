import { Bungee_400Regular, useFonts as useBungeeFont } from '@expo-google-fonts/bungee';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSansFont } from '@expo-google-fonts/dm-sans';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
      </Stack.Protected>
    </Stack>
  );
}
