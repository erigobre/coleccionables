import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIProcessingOverlay } from '../components/ui/AIProcessingOverlay';
import { Button } from '../components/ui/Button';
import { NoFtModal } from '../components/ui/NoFtModal';
import { PhotoPreview } from '../components/ui/PhotoPreview';
import { authErrorMessage, useAuth } from '../context/auth-context';
import { useFt } from '../context/ft-context';
import { ApiError } from '../lib/api';
import { setItemDraft } from '../lib/item-draft';
import { itemFormFromExtracted } from '../lib/item-form';
import { normalizeCameraOrientation } from '../lib/image';
import { checkCollectibility, uploadItemPhotos, type CollectibilityCheckResult } from '../lib/items';
import { useAiProcessing } from '../lib/use-ai-processing';
import { createWishlistItem, wishlistFieldsFromExtracted } from '../lib/wishlist';
import { colors } from '../theme/tokens';

const MAX_PHOTOS = 3;
const SEARCH_STEPS = ['Analizando el objeto...', 'Investigando precios...', 'Calificando qué tan coleccionable es...'];

const STARS_LABEL: Record<number, string> = {
  0: 'No coleccionable',
  1: 'Poco coleccionable',
  2: 'Algo coleccionable',
  3: 'Coleccionable',
  4: 'Muy coleccionable',
  5: 'Extremadamente coleccionable',
};

function formatPrice(price: number | null | undefined, currency: string): string {
  return price != null ? `${price} ${currency}` : 'Sin dato';
}

function PriceChip({ label, price, currency }: { label: string; price: number | null | undefined; currency: string }) {
  return (
    <View className="flex-1 items-center rounded-lg border border-border bg-surface px-3 py-3">
      <Text className="text-xs text-textMuted">{label}</Text>
      <Text className="mt-1 font-body-bold text-base text-text">{formatPrice(price, currency)}</Text>
    </View>
  );
}

// "¿Es Coleccionable?" (plan nuevo §4.7): foto → la IA identifica el objeto,
// lo califica de 0 a 5 estrellas de qué tan coleccionable es, y da precio de
// lanzamiento + precio actual de mercado. No compara contra la colección del
// usuario (no es detección de duplicados, es investigación de mercado).
export default function EsColeccionableScreen() {
  const { accessToken } = useAuth();
  const { costOf, refresh: refreshFt } = useFt();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<'analizar' | 'objeto' | 'wishlist' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noFtVisible, setNoFtVisible] = useState(false);
  const [result, setResult] = useState<CollectibilityCheckResult | null>(null);
  const analyzing = useAiProcessing();

  const addPhotos = (uris: string[]) => {
    setPhotos((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
    setAdding(false);
  };

  const onCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      const uri = await normalizeCameraOrientation(picture.uri);
      addPhotos([uri]);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const onPickFromGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (picked.canceled) return;
    addPhotos(picked.assets.map((asset) => asset.uri));
  };

  const onAnalyze = async () => {
    if (!accessToken) return;
    setBusy('analizar');
    setError(null);
    try {
      setResult(await analyzing.run(() => checkCollectibility(accessToken, photos)));
      refreshFt();
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setNoFtVisible(true);
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  };

  const startOver = () => {
    setResult(null);
    setPhotos([]);
    setError(null);
  };

  // El precio de lanzamiento detectado pasa como purchasePrice al formulario
  // de alta, y el precio actual de mercado se adjunta solo-lectura justo
  // después de crear el objeto (ver new.tsx), sin cobrar FT de nuevo.
  const onAddObject = async () => {
    if (!accessToken || !result) return;
    setBusy('objeto');
    setError(null);
    try {
      const photoUrls = await uploadItemPhotos(accessToken, photos);
      setItemDraft({
        values: itemFormFromExtracted(result.extracted),
        photoUrls,
        suggestedTags: result.extracted.suggestedTags ?? [],
        notice: 'Revisa lo que detectó la IA y corrige lo que haga falta.',
        source: 'ai',
        pendingMarketPrice: result.currentMarket,
      });
      router.replace('/new');
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  };

  const onAddToWishlist = async () => {
    if (!accessToken || !result) return;
    setBusy('wishlist');
    setError(null);
    try {
      const [photoUrl] = await uploadItemPhotos(accessToken, photos.slice(0, 1));
      await createWishlistItem(accessToken, {
        name: result.extracted.name?.trim() || 'Objeto sin nombre',
        category: result.extracted.category,
        photoUrl,
        ...wishlistFieldsFromExtracted(result.extracted),
      });
      router.replace('/(tabs)/wishlist');
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-backgroundDeep" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-backgroundDeep px-8">
        <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
        <Text className="mb-6 mt-4 text-center text-base text-textSecondary">
          Frikidex necesita la cámara para analizar el objeto.
        </Text>
        <View className="w-full">
          <Button label="Permitir cámara" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  if (result) {
    const identified = !!result.extracted.name;
    const stars = Math.min(5, Math.max(0, Math.round(result.collectibilityStars)));

    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      >
        {!identified ? (
          <View className="items-center">
            <Ionicons name="help-circle-outline" size={48} color={colors.textMuted} />
            <Text className="mb-6 mt-4 text-center text-sm text-textMuted">
              No pudimos reconocer el objeto con claridad.
            </Text>
            <View className="w-full">
              <Button label="Investigar otro objeto" variant="ghost" onPress={startOver} />
            </View>
          </View>
        ) : (
          <>
            <View className="items-center">
              {photos[0] ? (
                <Image source={{ uri: photos[0] }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : null}
              <Text className="mt-3 text-center font-display text-xl uppercase tracking-wide text-text">
                {result.extracted.name}
              </Text>

              <View className="mt-3 flex-row gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons key={n} name={n <= stars ? 'star' : 'star-outline'} size={26} color={colors.primary} />
                ))}
              </View>
              <Text className="mt-1 text-sm text-textSecondary">{STARS_LABEL[stars]}</Text>
            </View>

            <View className="mt-5 flex-row items-center gap-3">
              <PriceChip label="Precio de lanzamiento" price={result.extracted.purchasePrice} currency={result.currentMarket.currency} />
              <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
              <PriceChip label="Precio actual" price={result.currentMarket.averagePrice} currency={result.currentMarket.currency} />
            </View>

            {result.collectibilityExplanation ? (
              <Text className="mt-5 text-sm text-textSecondary">{result.collectibilityExplanation}</Text>
            ) : null}

            {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}

            <View className="mt-6 gap-3">
              <Button label="Agregar objeto" onPress={onAddObject} loading={busy === 'objeto'} disabled={busy === 'wishlist'} />
              <Button
                label="Agregar a wishlist"
                variant="secondary"
                onPress={onAddToWishlist}
                loading={busy === 'wishlist'}
                disabled={busy === 'objeto'}
              />
              <Button label="Investigar otro objeto" variant="ghost" onPress={startOver} disabled={busy !== null} />
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  if (photos.length > 0 && !adding) {
    return (
      <View className="flex-1 bg-backgroundDeep" style={{ paddingTop: insets.top + 56 }}>
        <View className="flex-1 px-5">
          <PhotoPreview photos={photos} setPhotos={setPhotos} disabled={busy !== null} />
        </View>

        <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 20, paddingTop: 16 }}>
          {error ? <Text className="text-center text-sm text-danger">{error}</Text> : null}
          <Button
            label="Analizar"
            ftCost={costOf('COLLECTIBILITY_CHECK')}
            onPress={onAnalyze}
            loading={busy === 'analizar'}
          />
          {photos.length < MAX_PHOTOS ? (
            <Button label="Agregar otra foto" variant="ghost" onPress={() => setAdding(true)} disabled={busy !== null} />
          ) : null}
          <Text className="text-center text-xs text-textMuted">
            Al analizar, la foto se envía a un servicio de IA para reconocer el objeto e investigar precios.
          </Text>
        </View>
        <AIProcessingOverlay
          visible={analyzing.visible}
          done={analyzing.done}
          onHidden={analyzing.onHidden}
          steps={SEARCH_STEPS}
        />
        <NoFtModal visible={noFtVisible} onClose={() => setNoFtVisible(false)} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-backgroundDeep">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      <View pointerEvents="none" className="absolute inset-x-0 items-center" style={{ top: insets.top + 64 }}>
        <Text className="rounded-full bg-background/70 px-4 py-2 text-sm text-white">
          Encuadra el objeto y toma la foto
        </Text>
      </View>

      <View className="absolute inset-x-0 bottom-0 items-center" style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="w-full flex-row items-center justify-around px-8">
          <Pressable onPress={onPickFromGallery} className="h-12 w-12 items-center justify-center rounded-full bg-background/70">
            <Ionicons name="images-outline" size={24} color={colors.white} />
          </Pressable>
          <Pressable
            onPress={onCapture}
            disabled={!cameraReady}
            className="h-20 w-20 items-center justify-center rounded-full border-4 border-white"
          >
            <View className="h-14 w-14 rounded-full bg-primary" />
          </Pressable>
          {photos.length > 0 ? (
            <Pressable onPress={() => setAdding(false)} className="h-12 items-center justify-center rounded-full bg-background/70 px-4">
              <Text className="text-sm text-white">Volver</Text>
            </Pressable>
          ) : (
            // Espaciador: mantiene centrado el disparador (mismo ancho que el
            // botón de galería del otro lado).
            <View className="h-12 w-12" />
          )}
        </View>
        {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}
      </View>
    </View>
  );
}
