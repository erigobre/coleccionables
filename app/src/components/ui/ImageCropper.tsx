import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { cropPhoto, getImageSize } from '../../lib/image';
import { colors, radius, spacing } from '../../theme/tokens';
import { Button } from './Button';

type RatioKey = '1:1' | '3:4' | '4:3';

const RATIOS: Record<RatioKey, number> = { '1:1': 1, '3:4': 3 / 4, '4:3': 4 / 3 };
const RATIO_LABEL: Record<RatioKey, string> = { '1:1': '1:1', '3:4': '3:4', '4:3': '4:3' };
const MAX_SCALE = 5;
const BOX_SPACE_FOR_CONTROLS = 280; // header + botones de proporción + botones de acción, aprox.

interface ImageCropperProps {
  uri: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

// Recorte propio con pan/zoom (plan "Recorte de imágenes" §2): proporción
// sugerida según orientación de la foto, con botones para cambiarla a mano.
export function ImageCropper({ uri, onConfirm, onCancel }: ImageCropperProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [ratioKey, setRatioKey] = useState<RatioKey>('1:1');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setImageSize(null);
    setError(null);
    getImageSize(uri)
      .then((size) => {
        if (!active) return;
        setImageSize(size);
        setRatioKey(size.width > size.height ? '4:3' : size.width < size.height ? '3:4' : '1:1');
      })
      .catch(() => {
        if (active) setError('No se pudo leer la foto');
      });
    return () => {
      active = false;
    };
  }, [uri]);

  const box = useMemo(() => {
    const ratio = RATIOS[ratioKey];
    const availW = windowWidth - spacing.screenPadding * 2;
    const availH = Math.max(160, windowHeight - BOX_SPACE_FOR_CONTROLS);
    let width = availW;
    let height = width / ratio;
    if (height > availH) {
      height = availH;
      width = height * ratio;
    }
    return { width, height };
  }, [ratioKey, windowWidth, windowHeight]);

  const display = useMemo(() => {
    if (!imageSize) return null;
    const baseScale = Math.max(box.width / imageSize.width, box.height / imageSize.height);
    return { width: imageSize.width * baseScale, height: imageSize.height * baseScale, baseScale };
  }, [imageSize, box]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  // Al cambiar de proporción el recuadro cambia de tamaño: se reinicia la
  // posición/zoom en vez de intentar reconvertir (más simple y predecible).
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioKey, display?.width, display?.height]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const clampAfterGesture = () => {
    if (!display) return;
    const maxOffsetX = Math.max(0, (display.width * scale.value - box.width) / 2);
    const maxOffsetY = Math.max(0, (display.height * scale.value - box.height) / 2);
    translateX.value = withTiming(clamp(translateX.value, -maxOffsetX, maxOffsetX), { duration: 150 });
    translateY.value = withTiming(clamp(translateY.value, -maxOffsetY, maxOffsetY), { duration: 150 });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(clampAfterGesture);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, 1, MAX_SCALE);
    })
    .onEnd(clampAfterGesture);

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onConfirmPress = async () => {
    if (!imageSize || !display) return;
    setSaving(true);
    setError(null);
    try {
      // Se re-clampa aquí (no solo en onEnd del gesto) por si se confirma
      // mientras el withTiming de "regreso al límite" todavía está animando.
      const s = scale.value;
      const maxOffsetX = Math.max(0, (display.width * s - box.width) / 2);
      const maxOffsetY = Math.max(0, (display.height * s - box.height) / 2);
      const tx = clamp(translateX.value, -maxOffsetX, maxOffsetX);
      const ty = clamp(translateY.value, -maxOffsetY, maxOffsetY);
      const originX = clamp((-((box.width - display.width * s) / 2) - tx) / (display.baseScale * s), 0, imageSize.width);
      const originY = clamp((-((box.height - display.height * s) / 2) - ty) / (display.baseScale * s), 0, imageSize.height);
      const width = clamp(box.width / (display.baseScale * s), 1, imageSize.width - originX);
      const height = clamp(box.height / (display.baseScale * s), 1, imageSize.height - originY);
      const cropped = await cropPhoto(uri, {
        originX: Math.round(originX),
        originY: Math.round(originY),
        width: Math.round(width),
        height: Math.round(height),
      });
      onConfirm(cropped);
    } catch {
      setError('No se pudo recortar la foto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center bg-backgroundDeep px-5 py-6">
        <View className="w-full flex-row items-center justify-between">
          <Pressable
            onPress={onCancel}
            disabled={saving}
            accessibilityLabel="Cancelar recorte"
            className="h-11 w-11 items-center justify-center rounded-full bg-surfaceElevated active:opacity-80"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text className="font-display text-base uppercase text-primary">Recortar foto</Text>
          <View className="h-11 w-11" />
        </View>

        <View className="flex-1 items-center justify-center">
          {!imageSize || !display ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View
              style={{ width: box.width, height: box.height, borderRadius: radius.image, overflow: 'hidden' }}
              className="bg-surface"
            >
              <GestureDetector gesture={composedGesture}>
                <Animated.View
                  style={[
                    { position: 'absolute', left: 0, top: 0, width: box.width, height: box.height },
                    outerStyle,
                  ]}
                >
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        left: (box.width - display.width) / 2,
                        top: (box.height - display.height) / 2,
                        width: display.width,
                        height: display.height,
                      },
                      innerStyle,
                    ]}
                  >
                    <Image source={{ uri }} style={{ width: display.width, height: display.height }} />
                  </Animated.View>
                </Animated.View>
              </GestureDetector>
            </View>
          )}
        </View>

        <View className="w-full flex-row justify-center gap-3">
          {(Object.keys(RATIOS) as RatioKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setRatioKey(key)}
              className={`rounded-full px-4 py-2 ${key === ratioKey ? 'bg-primary' : 'bg-surfaceElevated'}`}
            >
              <Text className={key === ratioKey ? 'text-primaryText' : 'text-textSecondary'}>
                {RATIO_LABEL[key]}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text className="mt-3 text-center text-sm text-danger">{error}</Text> : null}

        <View className="mt-4 w-full gap-3">
          <Button label="Confirmar" onPress={onConfirmPress} loading={saving} disabled={!imageSize} />
          <Button label="Cancelar" variant="ghost" onPress={onCancel} disabled={saving} />
        </View>
      </View>
    </Modal>
  );
}
