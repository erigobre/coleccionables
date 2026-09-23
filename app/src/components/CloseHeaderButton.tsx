import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '../theme/tokens';

// captura/ya-lo-tengo se abren siempre con router.push desde otra pantalla,
// así que siempre hay historial al que volver; el fallback a Home es solo
// por si algún día se abren vía deep link directo.
export function CloseHeaderButton() {
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
