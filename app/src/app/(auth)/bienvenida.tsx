import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/auth-context';
import { API_BASE_URL } from '../../lib/api';
import { colors } from '../../theme/tokens';

export default function BienvenidaScreen() {
  const insets = useSafeAreaInsets();
  const { lastIdentity } = useAuth();

  // Un dispositivo que ya inició sesión antes (lastIdentity sobrevive al
  // reinstalar la app, ver auth-storage.ts) no necesita esta pantalla: va
  // directo al login con el saludo "Hola de nuevo, {nombre}".
  useEffect(() => {
    if (lastIdentity) router.replace('/(auth)/login');
  }, [lastIdentity]);

  if (lastIdentity) return null;

  return (
    <LinearGradient
      colors={[colors.backgroundDeep, colors.background, colors.secondary]}
      locations={[0, 0.6, 1]}
      style={{ flex: 1 }}
    >
      <View
        className="flex-1 justify-between px-6"
        style={{ paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 }}
      >
        <View className="items-center">
          <Image source={require('../../../assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 20 }} />
          <View className="mt-5 flex-row">
            <Text className="font-display text-[34px] uppercase tracking-wide text-text">FRIKI</Text>
            <Text className="font-display text-[34px] uppercase tracking-wide text-primary">DEX</Text>
          </View>
          <Text
            className="mt-3 text-center text-xs font-body-bold uppercase text-textSecondary"
            style={{ letterSpacing: 3 }}
          >
            Escanea · Identifica · Colecciona
          </Text>
        </View>

        <View>
          <Button label="Iniciar sesión" onPress={() => router.push('/(auth)/login')} />
          <Text
            onPress={() => router.push('/(auth)/register')}
            className="mt-5 text-center text-sm font-body-bold"
            style={{ color: colors.primary }}
          >
            Regístrate
          </Text>
          <Text className="mt-6 text-center text-xs text-textMuted">
            Al continuar, aceptas la{' '}
            <Text
              className="font-body-bold"
              style={{ color: colors.primary }}
              onPress={() => Linking.openURL(`${API_BASE_URL}/privacidad`)}
            >
              política de privacidad
            </Text>{' '}
            y las{' '}
            <Text
              className="font-body-bold"
              style={{ color: colors.primary }}
              onPress={() => Linking.openURL(`${API_BASE_URL}/terminos`)}
            >
              condiciones de uso
            </Text>{' '}
            de Frikidex.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
