import { useEffect, useMemo, useRef } from 'react';
import { Image, type ImageSourcePropType, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { FtCoin } from './FtCoin';

const FALL_DURATION = 1700;
const BOUNCE_UP_DURATION = 160;
const BOUNCE_DOWN_DURATION = 160;
const FADE_DURATION = 260;
const MAX_SIMULTANEOUS = 14;
const SLOT_STAGGER_MS = 90;

interface FallingCoinsAnimationProps {
  visible: boolean;
  /** Imagen alterna a la moneda por defecto (ej. para la futura pantalla de compra exitosa de FT). */
  coinImage?: ImageSourcePropType;
  /** Multiplicador sobre el tamaño base (26-40px) de cada moneda. */
  sizeScale?: number;
  count?: number;
  onDone?: () => void;
}

interface CoinSpec {
  key: number;
  x: number;
  size: number;
  rotateFrom: number;
  rotateTo: number;
  delay: number;
}

function Coin({ spec, floor, coinImage }: { spec: CoinSpec; floor: number; coinImage?: ImageSourcePropType }) {
  const translateY = useSharedValue(-120);
  const rotate = useSharedValue(spec.rotateFrom);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      spec.delay,
      withSequence(
        withTiming(floor, { duration: FALL_DURATION, easing: Easing.in(Easing.quad) }),
        withTiming(floor - 22, { duration: BOUNCE_UP_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(floor, { duration: BOUNCE_DOWN_DURATION, easing: Easing.in(Easing.quad) }),
      ),
    );
    rotate.value = withDelay(spec.delay, withTiming(spec.rotateTo, { duration: FALL_DURATION, easing: Easing.linear }));
    opacity.value = withDelay(
      spec.delay + FALL_DURATION + BOUNCE_UP_DURATION + BOUNCE_DOWN_DURATION + 200,
      withTiming(0, { duration: FADE_DURATION }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: spec.x,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      {coinImage ? (
        <Image source={coinImage} style={{ width: spec.size, height: spec.size }} resizeMode="contain" />
      ) : (
        <FtCoin size={spec.size} />
      )}
    </Animated.View>
  );
}

// Lluvia de monedas reusable (nace para el regalo de bienvenida del onboarding,
// pensada también para la futura pantalla de compra exitosa de FT — por eso
// `coinImage` es sustituible). Limita las monedas visibles a la vez
// (MAX_SIMULTANEOUS) reciclando "carriles": una moneda nueva en el mismo
// carril solo empieza a caer cuando la anterior de ese carril ya debió
// terminar su caída+rebote, así `count` puede ser mucho mayor sin saturar
// la pantalla.
export function FallingCoinsAnimation({ visible, coinImage, sizeScale = 1, count = 20, onDone }: FallingCoinsAnimationProps) {
  const { width, height } = useWindowDimensions();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const coins = useMemo<CoinSpec[]>(() => {
    if (!visible) return [];
    const lanes = Math.min(count, MAX_SIMULTANEOUS);
    const roundDuration = FALL_DURATION + BOUNCE_UP_DURATION + BOUNCE_DOWN_DURATION + 200 + FADE_DURATION;
    return Array.from({ length: count }, (_, i) => {
      const lane = i % lanes;
      const round = Math.floor(i / lanes);
      const size = Math.round((26 + Math.round(Math.random() * 14)) * sizeScale);
      return {
        key: i,
        x: 16 + Math.random() * Math.max(width - 48, 0),
        size,
        rotateFrom: Math.random() * 60 - 30,
        rotateTo: Math.random() * 360 + 180,
        delay: lane * SLOT_STAGGER_MS + round * roundDuration,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, count, width, sizeScale]);

  useEffect(() => {
    if (!visible || coins.length === 0) return;
    const last = coins[coins.length - 1];
    const totalMs = last.delay + FALL_DURATION + BOUNCE_UP_DURATION + BOUNCE_DOWN_DURATION + 200 + FADE_DURATION;
    const timer = setTimeout(() => onDoneRef.current?.(), totalMs);
    return () => clearTimeout(timer);
  }, [visible, coins]);

  if (!visible) return null;

  const floor = height - 90;

  return (
    <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
      {coins.map((spec) => (
        <Coin key={spec.key} spec={spec} floor={floor} coinImage={coinImage} />
      ))}
    </View>
  );
}
