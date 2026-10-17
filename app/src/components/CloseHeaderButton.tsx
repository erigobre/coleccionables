import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '../theme/tokens';

interface CloseHeaderButtonProps {
  // "overlay": ícono claro sobre pastilla translúcida, para headers transparentes
  // (cámara). "plain": ícono al tono del header normal, sin pastilla, para
  // pantallas con header opaco (formularios, detalle de objeto).
  variant?: 'overlay' | 'plain';
  // A dónde volver si no hay historial (llegó por un `replace` que dejó esta
  // pantalla como única entrada). Por defecto Home.
  fallbackTo?: string;
}

export function CloseHeaderButton({ variant = 'overlay', fallbackTo = '/(tabs)' }: CloseHeaderButtonProps) {
  const router = useRouter();
  const onPress = () => (router.canGoBack() ? router.back() : router.replace(fallbackTo as never));

  if (variant === 'plain') {
    return (
      <Pressable onPress={onPress} hitSlop={12} className="h-9 w-9 items-center justify-center">
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      className="ml-1 h-9 w-9 items-center justify-center rounded-full bg-background/40"
    >
      <Ionicons name="chevron-back" size={22} color={colors.white} />
    </Pressable>
  );
}
