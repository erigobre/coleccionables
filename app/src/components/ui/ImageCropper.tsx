import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { cropPhoto, getImageSize } from '../../lib/image';
import { colors, radius, spacing } from '../../theme/tokens';
import { Button } from './Button';

type RatioKey = '1:1' | '3:4' | '4:3';

const RATIOS: Record<RatioKey, number> = { '1:1': 1, '3:4': 3 / 4, '4:3': 4 / 3 };
const RATIO_LABEL: Record<RatioKey, string> = { '1:1': '1:1', '3:4': '3:4', '4:3': '4:3' };
const MAX_SCALE = 5;
const BOX_SPACE_FOR_CONTROLS = 280; // header + botones de proporción + botones de acción, aprox.

interface Pose {
  x: number;
  y: number;
  s: number;
}

interface Display {
  width: number;
  height: number;
  baseScale: number;
}

interface Box {
  width: number;
  height: number;
}

interface ImageCropperProps {
  uri: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
  // Foto de perfil (plan de Ajustes): fuerza 1:1 y oculta los botones de
  // proporción, en vez de sugerir una según orientación.
  lockedRatio?: RatioKey;
}

// Funciones puras (sin Reanimated ni worklets): se ejecutan en el hilo de JS.
// El recorte anterior usaba gestos de Reanimated y crasheaba el hilo de UI
// (build 13, 2026-10-04 y 2026-10-02) por excepciones de JS dentro de worklets.
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampPose(pose: Pose, display: Display, box: Box): Pose {
  const s = clamp(pose.s, 1, MAX_SCALE);
  const maxX = Math.max(0, (display.width * s - box.width) / 2);
  const maxY = Math.max(0, (display.height * s - box.height) / 2);
  return { x: clamp(pose.x, -maxX, maxX), y: clamp(pose.y, -maxY, maxY), s };
}

function touchDistance(touches: GestureResponderEvent['nativeEvent']['touches']) {
  if (touches.length < 2) return null;
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

// Recorte propio con pan/zoom (plan "Recorte de imágenes" §2): proporción
// sugerida según orientación de la foto, con botones para cambiarla a mano.
export function ImageCropper({ uri, onConfirm, onCancel, lockedRatio }: ImageCropperProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [ratioKey, setRatioKey] = useState<RatioKey>(lockedRatio ?? '1:1');
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
        if (!lockedRatio) {
          setRatioKey(size.width > size.height ? '4:3' : size.width < size.height ? '3:4' : '1:1');
        }
      })
      .catch(() => {
        if (active) setError('No se pudo leer la foto');
      });
    return () => {
      active = false;
    };
  }, [uri, lockedRatio]);

  const box = useMemo<Box>(() => {
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

  const display = useMemo<Display | null>(() => {
    if (!imageSize) return null;
    const baseScale = Math.max(box.width / imageSize.width, box.height / imageSize.height);
    return { width: imageSize.width * baseScale, height: imageSize.height * baseScale, baseScale };
  }, [imageSize, box]);

  const [pose, setPose] = useState<Pose>({ x: 0, y: 0, s: 1 });
  // Espejos en refs para que los handlers del gesto lean siempre el valor vigente
  // sin recrear el PanResponder en cada render.
  const poseRef = useRef(pose);
  const layoutRef = useRef({ box, display });
  layoutRef.current = { box, display };
  // Base del gesto actual: se re-toma cada vez que cambia la cantidad de dedos
  // para que pasar de uno a dos (o al revés) no dé saltos.
  const baseRef = useRef<{ pose: Pose; dx: number; dy: number; count: number; dist: number | null } | null>(null);

  const applyPose = (next: Pose) => {
    poseRef.current = next;
    setPose(next);
  };

  // Al cambiar de proporción el recuadro cambia de tamaño: se reinicia la
  // posición/zoom en vez de intentar reconvertir (más simple y predecible).
  useEffect(() => {
    applyPose({ x: 0, y: 0, s: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioKey, display?.width, display?.height]);

  const panResponder = useMemo(() => {
    const rebase = (evt: GestureResponderEvent, gs: PanResponderGestureState) => {
      const touches = evt.nativeEvent.touches;
      baseRef.current = {
        pose: poseRef.current,
        dx: gs.dx,
        dy: gs.dy,
        count: touches.length,
        dist: touchDistance(touches),
      };
    };

    const settle = () => {
      baseRef.current = null;
      const { box: b, display: d } = layoutRef.current;
      if (!d) return;
      applyPose(clampPose(poseRef.current, d, b));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt, gs) => rebase(evt, gs),
      onPanResponderMove: (evt, gs) => {
        const { display: d, box: b } = layoutRef.current;
        if (!d) return;
        const touches = evt.nativeEvent.touches;
        if (!baseRef.current || baseRef.current.count !== touches.length) {
          rebase(evt, gs);
        }
        const base = baseRef.current;
        if (!base) return;

        let s = base.pose.s;
        const dist = touchDistance(touches);
        if (dist !== null && base.dist !== null && base.dist > 0 && Number.isFinite(dist)) {
          s = base.pose.s * (dist / base.dist);
        }
        const next = {
          x: base.pose.x + (gs.dx - base.dx),
          y: base.pose.y + (gs.dy - base.dy),
          s,
        };
        // Clamp en cada movimiento para que el recuadro nunca quede vacío.
        applyPose(clampPose(next, d, b));
      },
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
    });
  }, []);

  const onConfirmPress = async () => {
    if (!imageSize || !display) return;
    setSaving(true);
    setError(null);
    try {
      const { box: b, display: d } = layoutRef.current;
      if (!d) return;
      const p = clampPose(poseRef.current, d, b);
      const originX = clamp((-((b.width - d.width * p.s) / 2) - p.x) / (d.baseScale * p.s), 0, imageSize.width);
      const originY = clamp((-((b.height - d.height * p.s) / 2) - p.y) / (d.baseScale * p.s), 0, imageSize.height);
      const width = clamp(b.width / (d.baseScale * p.s), 1, imageSize.width - originX);
      const height = clamp(b.height / (d.baseScale * p.s), 1, imageSize.height - originY);
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

  const innerLeft = display ? (box.width - display.width) / 2 : 0;
  const innerTop = display ? (box.height - display.height) / 2 : 0;

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
              {...panResponder.panHandlers}
              style={{ width: box.width, height: box.height, borderRadius: radius.image, overflow: 'hidden' }}
              className="bg-surface"
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: box.width,
                  height: box.height,
                  transform: [{ translateX: pose.x }, { translateY: pose.y }],
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: innerLeft,
                    top: innerTop,
                    width: display.width,
                    height: display.height,
                    transform: [{ scale: pose.s }],
                  }}
                >
                  <Image source={{ uri }} style={{ width: display.width, height: display.height }} />
                </View>
              </View>
            </View>
          )}
        </View>

        {!lockedRatio ? (
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
        ) : null}

        {error ? <Text className="mt-3 text-center text-sm text-danger">{error}</Text> : null}

        <View className="mt-4 w-full gap-3">
          <Button label="Confirmar" onPress={onConfirmPress} loading={saving} disabled={!imageSize} />
          <Button label="Cancelar" variant="ghost" onPress={onCancel} disabled={saving} />
        </View>
      </View>
    </Modal>
  );
}
