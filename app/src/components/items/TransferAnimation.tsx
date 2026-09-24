import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Image, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

const TOTAL_MS = 2300;
const PHOTO_SIZE = 168;
const BALL_SIZE = 116;

interface TransferAnimationProps {
  photoUri?: string;
  recipientLabel: string;
  onDone: () => void;
}

// Animación "envío de Pokémon" (plan §5.3.9.3): la foto se comprime en una
// cápsula, esta se sacude y sale disparada hacia arriba. Todo cuelga de un único
// reloj `t` (en ms) para que la secuencia sea determinista y fácil de ajustar.
export function TransferAnimation({ photoUri, recipientLabel, onDone }: TransferAnimationProps) {
  const { height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(TOTAL_MS, { duration: TOTAL_MS, easing: Easing.linear });
    // onDone se dispara con un setTimeout en JS, no con el callback de
    // withTiming (corre en el runtime de UI vía CADisplayLink): un throw ahí
    // no queda atrapado y tira abajo la app entera (mismo crash confirmado
    // en AIProcessingOverlay al revisar precio de mercado).
    const timeout = setTimeout(onDone, TOTAL_MS);
    return () => clearTimeout(timeout);
    // Se dispara una sola vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 0-450: la foto gira y se encoge; la cápsula aparece en su lugar.
  const photoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [300, 450], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(t.value, [0, 450], [1, 0.15], Extrapolation.CLAMP) },
      { rotate: `${interpolate(t.value, [0, 450], [0, 360], Extrapolation.CLAMP)}deg` },
    ],
  }));

  // 700-1150: la cápsula se sacude. 1150-1900: sale disparada hacia arriba.
  const ballStyle = useAnimatedStyle(() => {
    const launch = interpolate(t.value, [1150, 1900], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: interpolate(t.value, [300, 450, 1650, 1900], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: -launch * launch * height * 0.6 },
        { scale: interpolate(t.value, [300, 480, 1150, 1900], [0, 1, 1, 0.3], Extrapolation.CLAMP) },
        {
          rotate: `${interpolate(
            t.value,
            [700, 780, 860, 940, 1020, 1100, 1150],
            [0, -18, 18, -14, 14, -6, 0],
            Extrapolation.CLAMP,
          )}deg`,
        },
      ],
    };
  });

  // Onda de choque en el momento del disparo.
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [1150, 1700], [0.9, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(t.value, [1150, 1700], [0.4, 3.2], Extrapolation.CLAMP) }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [1300, 1600], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(t.value, [1300, 1600], [12, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View className="flex-1 items-center justify-center bg-backgroundDeep px-8">
      <View style={{ width: PHOTO_SIZE, height: PHOTO_SIZE }} className="items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: BALL_SIZE,
              height: BALL_SIZE,
              borderRadius: BALL_SIZE / 2,
              borderWidth: 3,
              borderColor: colors.primary,
            },
            ringStyle,
          ]}
        />

        <Animated.View style={[{ position: 'absolute' }, ballStyle]}>
          <Capsule />
        </Animated.View>

        <Animated.View style={photoStyle}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 24 }} />
          ) : (
            <View
              style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 24 }}
              className="items-center justify-center bg-surfaceElevated"
            >
              <Ionicons name="cube-outline" size={56} color={colors.textMuted} />
            </View>
          )}
        </Animated.View>
      </View>

      <Animated.View style={textStyle} className="mt-10 items-center">
        <Text className="font-display text-2xl uppercase tracking-wide text-primary">¡Enviado!</Text>
        <Text className="mt-2 text-center text-base text-textSecondary">
          Esperando que {recipientLabel} lo acepte
        </Text>
      </Animated.View>
    </View>
  );
}

// Cápsula de Frikidex: mitad violeta, mitad crema, botón lima al centro.
function Capsule() {
  return (
    <View
      style={{ width: BALL_SIZE, height: BALL_SIZE, borderRadius: BALL_SIZE / 2 }}
      className="items-center justify-center overflow-hidden border-4 border-backgroundDeep bg-text"
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BALL_SIZE / 2 }} className="bg-secondary" />
      <View style={{ position: 'absolute', top: BALL_SIZE / 2 - 5, left: 0, right: 0, height: 10 }} className="bg-backgroundDeep" />
      <View
        style={{ width: 34, height: 34, borderRadius: 17 }}
        className="items-center justify-center border-4 border-backgroundDeep bg-primary"
      />
    </View>
  );
}
