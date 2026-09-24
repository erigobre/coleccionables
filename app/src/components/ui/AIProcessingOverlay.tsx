import { useEffect, useState } from 'react';
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
import { scheduleOnRN } from 'react-native-worklets';
import { colors } from '../../theme/tokens';

const LOGO_SIZE = 104;
const FINAL_TEXT = '¡Proceso finalizado!';
const STEP_INTERVAL_MS = 1500;
const HOLD_BEFORE_EXIT_MS = 700;

interface AIProcessingOverlayProps {
  visible: boolean;
  // Textos que se van rotando mientras `done` es false (plan: dar feedback
  // psicológico de que la app sigue trabajando, no se trabó).
  steps: string[];
  // Al pasar a true, se fuerza el texto final y arranca el fade-out invertido.
  done: boolean;
  onHidden: () => void;
}

// Overlay de "consultando IA" (¿Ya lo tengo?/Analizar/Obtener precio): réplica
// en RN de la transición "pixelWipe" de la landing (api/public/index.html) —
// fondo con blur+oscurecido y el logo entrando girando (rotateY 0→720°), con
// textos de estado debajo que van cambiando. Al terminar el proceso se fuerza
// "¡Proceso finalizado!" y se hace el mismo giro pero invertido, desvaneciendo
// hacia el centro (scale→0, +360° más de giro, opacity→0).
export function AIProcessingOverlay({ visible, steps, done, onHidden }: AIProcessingOverlayProps) {
  const intro = useSharedValue(0);
  const spin = useSharedValue(0);
  const outro = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const [mounted, setMounted] = useState(visible);
  const [currentText, setCurrentText] = useState(steps[0] ?? '');

  useEffect(() => {
    if (!visible) return;
    setMounted(true);
    intro.value = 0;
    outro.value = 0;
    textOpacity.value = 0;
    intro.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    textOpacity.value = withTiming(1, { duration: 300 });
    spin.value = 0;
    spin.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    // Se dispara una sola vez al mostrarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Ciclo de textos de estado mientras el proceso sigue corriendo.
  useEffect(() => {
    if (!visible || done) return;
    setCurrentText(steps[0] ?? '');
    if (steps.length <= 1) return;
    let index = 0;
    const id = setInterval(() => {
      index = (index + 1) % steps.length;
      setCurrentText(steps[index] ?? '');
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, done, steps.join('|')]);

  // Al terminar: se congela el texto final un momento (para que se alcance a
  // leer) y luego corre el fade-out invertido.
  useEffect(() => {
    if (!done || !visible) return;
    setCurrentText(FINAL_TEXT);
    const timeout = setTimeout(() => {
      cancelAnimation(spin);
      outro.value = withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          scheduleOnRN(() => {
            setMounted(false);
            onHidden();
          });
        }
      });
    }, HOLD_BEFORE_EXIT_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: intro.value * (1 - outro.value),
  }));

  const logoStyle = useAnimatedStyle(() => {
    const rotate = intro.value * 720 + spin.value * 360 + outro.value * 360;
    const scale = intro.value * (1 - outro.value);
    return {
      opacity: Math.min(1, intro.value * 1.3) * (1 - outro.value),
      // rotateY es una transformación 3D: sin "perspective" en el mismo array,
      // RN la renderiza plana y a 90°/270° el layer se ve de canto y se corta
      // (el "se parte a la mitad" que se veía en pantalla).
      transform: [{ perspective: 800 }, { scale }, { rotateY: `${rotate}deg` }],
    };
  });

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value * (1 - outro.value),
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.backgroundDeep, opacity: 0.66 }]} />
      </Animated.View>
      <View className="flex-1 items-center justify-center px-10">
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../../assets/icon.png')}
            style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 24 }}
          />
        </Animated.View>
        <Animated.View style={[textStyle, { marginTop: 24 }]}>
          <Text className="text-center text-sm text-textSecondary">{currentText}</Text>
        </Animated.View>
      </View>
    </View>
  );
}
