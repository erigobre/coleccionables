import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: IconName[] = [
  'game-controller-outline',
  'book-outline',
  'color-palette-outline',
  'disc-outline',
  'rocket-outline',
  'trophy-outline',
  'shirt-outline',
];

const DROP_DELAY = 150;
const DROP_DURATION = 600;
const PAUSE_AFTER_ARRIVE = 500;

function DropIcon({ name, onArrive }: { name: IconName; onArrive: () => void }) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withDelay(
      DROP_DELAY,
      withTiming(46, { duration: DROP_DURATION, easing: Easing.in(Easing.quad) }, () => {
        opacity.value = withTiming(0, { duration: 100 });
        runOnJS(onArrive)();
      }),
    );
    scale.value = withDelay(DROP_DELAY, withTiming(0.3, { duration: DROP_DURATION, easing: Easing.in(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top: 0 }, style]} pointerEvents="none">
      <Ionicons name={name} size={26} color={colors.white} />
    </Animated.View>
  );
}

// Animación decorativa en bucle para la pantalla de bienvenida del onboarding:
// un ícono distinto "cae" dentro de una caja con el logo de Frikidex, la caja
// rebota al recibirlo, y tras una pausa llega el siguiente ícono — se repite
// indefinidamente mientras el componente esté montado.
export function CollectingBoxAnimation() {
  const [tick, setTick] = useState(0);
  const boxScale = useSharedValue(1);
  const icon = ICONS[tick % ICONS.length];

  const onArrive = () => {
    boxScale.value = withSequence(withTiming(0.9, { duration: 110 }), withTiming(1, { duration: 150 }));
    setTimeout(() => setTick((t) => t + 1), PAUSE_AFTER_ARRIVE);
  };

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: boxScale.value }] }));

  return (
    <View style={{ height: 118, width: 100, alignItems: 'center' }}>
      <View style={{ height: 56, width: 56 }}>
        <DropIcon key={tick} name={icon} onArrive={onArrive} />
      </View>
      <Animated.View
        style={[
          {
            width: 76,
            height: 58,
            borderRadius: 12,
            backgroundColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
          },
          boxStyle,
        ]}
      >
        <Image
          source={require('../../../assets/icon.png')}
          style={{ width: 30, height: 30, borderRadius: 7 }}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}
