import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const RISE_DISTANCE = SCREEN_HEIGHT * 0.8;

type Particle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
};

function ParticleDot({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withRepeat(withTiming(1, { duration: particle.duration, easing: Easing.linear }), -1, false),
    );
  }, [particle, progress]);

  const style = useAnimatedStyle(() => {
    // Sube en línea recta y se desvanece al nacer y al llegar arriba, como
    // energía que flota: sin esto se vería un "pop" brusco de aparición/corte.
    const fadeIn = Math.min(progress.value / 0.12, 1);
    const fadeOut = Math.min((1 - progress.value) / 0.25, 1);
    return {
      transform: [{ translateY: -progress.value * RISE_DISTANCE }],
      opacity: Math.max(Math.min(fadeIn, fadeOut), 0) * 0.75,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.left,
          bottom: 20,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

export function FloatingParticles({ count = 18 }: { count?: number }) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * SCREEN_WIDTH,
        size: 3 + Math.random() * 5,
        duration: 5000 + Math.random() * 5000,
        delay: Math.random() * 7000,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
      })),
    [count],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((particle) => (
        <ParticleDot key={particle.id} particle={particle} />
      ))}
    </View>
  );
}
