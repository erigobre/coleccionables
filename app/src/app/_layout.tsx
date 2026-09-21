import { Bungee_400Regular, useFonts as useBungeeFont } from '@expo-google-fonts/bungee';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts as useDMSansFont } from '@expo-google-fonts/dm-sans';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../../global.css';
import { AuthProvider, useAuth } from '../context/auth-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [bungeeLoaded] = useBungeeFont({ Bungee_400Regular });
  const [dmSansLoaded] = useDMSansFont({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const fontsLoaded = bungeeLoaded && dmSansLoaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator fontsLoaded={fontsLoaded} />
          <StatusBar style="light" />
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
      </Stack.Protected>
    </Stack>
  );
}
