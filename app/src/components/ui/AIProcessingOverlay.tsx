import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

const LOGO_SIZE = 104;
const FINAL_TEXT = '¡Proceso finalizado!';
const STEP_INTERVAL_MS = 3500;
const HOLD_BEFORE_EXIT_MS = 700;
const OUTRO_DURATION_MS = 420;

interface AIProcessingOverlayProps {
  visible: boolean;
  // Textos que se van rotando mientras `done` es false (plan: dar feedback
  // psicológico de que la app sigue trabajando, no se trabó).
  steps: string[];
  // Al pasar a true, se fuerza el texto final y arranca el fade-out invertido.
  done: boolean;
  onHidden: () => void;
}

// Overlay de "consultando IA" (¿Ya lo tengo?/Analizar/Obtener precio): fondo
// con blur+oscurecido y el logo estático (fade+scale al entrar/salir, sin giro
// — el giro con rotateY se veía roto en algunos dispositivos incluso con
// "perspective"; se deja estático hasta reemplazarlo por un GIF animado).
export function AIProcessingOverlay({ visible, steps, done, onHidden }: AIProcessingOverlayProps) {
  const intro = useSharedValue(0);
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

  // Al terminar: se congela el texto final un momento (para que se alcance a
  // leer) y luego corre el fade-out. El cierre se dispara con un setTimeout en
  // JS (no con el callback de withTiming vía scheduleOnRN): ese callback corre
  // en el runtime de UI de Reanimated disparado por CADisplayLink, y si algo
  // ahí lanzaba una excepción no atrapada tiraba abajo la app entera (crash
  // confirmado con el crash log de iOS al revisar precio de mercado).
  useEffect(() => {
    if (!done || !visible) return;
    setCurrentText(FINAL_TEXT);
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

  const logoStyle = useAnimatedStyle(() => {
    const scale = intro.value * (1 - outro.value);
    return {
      opacity: Math.min(1, intro.value * 1.3) * (1 - outro.value),
      transform: [{ scale }],
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
