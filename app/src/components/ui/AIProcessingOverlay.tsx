import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';
import { FloatingParticles } from './FloatingParticles';

const LOGO_SIZE = 104;
const FINAL_TEXT = '¡Proceso finalizado!';
const HOLD_BEFORE_EXIT_MS = 700;
const OUTRO_DURATION_MS = 420;

// Relleno falso tipo "barra de carga psicológica": avanza rápido al inicio y
// se va frenando sin llegar nunca al 100% hasta que `done` sea true de
// verdad — así el logo siempre parece estar progresando, nunca "atorado", y
// nunca promete un tiempo que la IA no puede cumplir (el tiempo real varía
// mucho, de pocos segundos a más de un minuto).
const FILL_CAP = 0.93;
const FILL_TICK_MS = 150;
const FILL_EASE_FACTOR = 0.05;
const LONG_WAIT_MS = 15000;
const LONG_WAIT_TEXT = 'Esto está tardando más de lo usual, pero seguimos trabajando...';

interface AIProcessingOverlayProps {
  visible: boolean;
  // Textos que se van mostrando según el avance del relleno (plan: dar
  // feedback psicológico de que la app sigue trabajando, no se trabó).
  steps: string[];
  // Al pasar a true, se fuerza el texto final y arranca el fade-out invertido.
  done: boolean;
  onHidden: () => void;
}

// Overlay de "consultando IA" (¿Ya lo tengo?/Analizar/Obtener precio): fondo
// con blur+oscurecido, partículas sutiles de fondo (mismas que la bienvenida,
// a menor intensidad) y el logo rellenándose de abajo hacia arriba como agua
// mientras dura la consulta.
export function AIProcessingOverlay({ visible, steps, done, onHidden }: AIProcessingOverlayProps) {
  const intro = useSharedValue(0);
  const outro = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const fill = useSharedValue(0);
  const shimmer = useSharedValue(0.6);

  const [mounted, setMounted] = useState(visible);
  const [currentText, setCurrentText] = useState(steps[0] ?? '');
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setMounted(true);
    intro.value = 0;
    outro.value = 0;
    textOpacity.value = 0;
    fill.value = 0;
    intro.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    textOpacity.value = withTiming(1, { duration: 300 });
    // Se dispara una sola vez al mostrarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Relleno continuo + texto según umbral de avance alcanzado (nunca
  // retrocede ni se reinicia, a diferencia del ciclo por timer anterior que
  // repetía los 3 textos en bucle sin relación con lo que realmente tardaba
  // la petición — confuso cuando una consulta tardaba mucho más de lo usual).
  useEffect(() => {
    if (!visible || done) return;
    startedAtRef.current = Date.now();
    setCurrentText(steps[0] ?? '');
    shimmer.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    const id = setInterval(() => {
      const next = fill.value + (FILL_CAP - fill.value) * FILL_EASE_FACTOR;
      fill.value = withTiming(next, { duration: FILL_TICK_MS, easing: Easing.linear });
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed > LONG_WAIT_MS) {
        setCurrentText(LONG_WAIT_TEXT);
      } else if (steps.length > 0) {
        const stepIndex = Math.min(steps.length - 1, Math.floor(next * steps.length));
        setCurrentText(steps[stepIndex] ?? '');
      }
    }, FILL_TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, done, steps.join('|')]);

  // Si `visible` pasa a false sin que `done` haya llegado a true (p.ej. el
  // request falló y use-ai-processing oculta el overlay de inmediato), se
  // desmonta al instante sin esperar la animación de salida normal.
  useEffect(() => {
    if (visible || done) return;
    setMounted(false);
    intro.value = 0;
    outro.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, done]);

  // Al terminar: se completa el relleno al 100%, se congela el texto final
  // un momento (para que se alcance a leer) y luego corre el fade-out. El
  // cierre se dispara con un setTimeout en JS (no con el callback de
  // withTiming vía scheduleOnRN): ese callback corre en el runtime de UI de
  // Reanimated disparado por CADisplayLink, y si algo ahí lanzaba una
  // excepción no atrapada tiraba abajo la app entera (crash confirmado con
  // el crash log de iOS al revisar precio de mercado).
  useEffect(() => {
    if (!done || !visible) return;
    cancelAnimation(shimmer);
    setCurrentText(FINAL_TEXT);
    fill.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    let exitTimeout: ReturnType<typeof setTimeout> | undefined;
    const holdTimeout = setTimeout(() => {
      outro.value = withTiming(1, { duration: OUTRO_DURATION_MS, easing: Easing.in(Easing.cubic) });
      exitTimeout = setTimeout(() => {
        setMounted(false);
        onHidden();
      }, OUTRO_DURATION_MS);
    }, HOLD_BEFORE_EXIT_MS);
    return () => {
      clearTimeout(holdTimeout);
      clearTimeout(exitTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: intro.value * (1 - outro.value),
  }));

  const logoWrapStyle = useAnimatedStyle(() => {
    const scale = intro.value * (1 - outro.value);
    return {
      opacity: Math.min(1, intro.value * 1.3) * (1 - outro.value),
      transform: [{ scale }],
    };
  });

  const fillMaskStyle = useAnimatedStyle(() => ({
    height: fill.value * LOGO_SIZE,
  }));

  const waterLineStyle = useAnimatedStyle(() => ({
    bottom: fill.value * LOGO_SIZE - 1.5,
    opacity: 0.5 + shimmer.value * 0.5,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value * (1 - outro.value),
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundDeep, opacity: 0.66 }]} />
        <View style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}>
          <FloatingParticles count={10} />
        </View>
      </Animated.View>
      <View className="flex-1 items-center justify-center px-10">
        <Animated.View style={logoWrapStyle}>
          <View style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 24, overflow: 'hidden' }}>
            <Image
              source={require('../../../assets/icon.png')}
              style={{ width: LOGO_SIZE, height: LOGO_SIZE, opacity: 0.22 }}
            />
            <Animated.View style={[styles.fillMask, fillMaskStyle]}>
              <Image
                source={require('../../../assets/icon.png')}
                style={{ width: LOGO_SIZE, height: LOGO_SIZE, position: 'absolute', bottom: 0, left: 0 }}
              />
            </Animated.View>
            <Animated.View style={[styles.waterLine, waterLineStyle]} />
          </View>
        </Animated.View>
        <Animated.View style={[textStyle, { marginTop: 24 }]}>
          <Text className="text-center text-sm text-textSecondary">{currentText}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fillMask: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  waterLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
