import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { resolvePhotoUrl } from '../../../lib/api';
import { setItemDraft } from '../../../lib/item-draft';
import { itemFormFromExtracted } from '../../../lib/item-form';
import { usageLabel } from '../../../lib/item-enums';
import { identifyItemPhotos, uploadItemPhotos, type IdentifyResult, type ItemMatch } from '../../../lib/items';
import { createWishlistItem } from '../../../lib/wishlist';
import { colors } from '../../../theme/tokens';

const MAX_PHOTOS = 3;

function sinceLabel(match: ItemMatch): string {
  const date = new Date(match.item.acquisitionDate ?? match.item.createdAt);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function MatchCard({ match, highlight, onOpen }: { match: ItemMatch; highlight?: boolean; onOpen: () => void }) {
  const { item } = match;
  const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
  return (
    <Pressable
      onPress={onOpen}
      className={`mb-3 flex-row overflow-hidden rounded-xl bg-surface ${highlight ? 'border-2 border-primary' : ''}`}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 88, height: 88 }} />
      ) : (
        <View style={{ width: 88, height: 88 }} className="items-center justify-center bg-surfaceElevated">
          <Ionicons name="image-outline" size={24} color={colors.textMuted} />
        </View>
      )}
      <View className="flex-1 justify-center px-3 py-2">
        <Text className="font-body-bold text-base text-text" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-0.5 text-xs text-textMuted" numberOfLines={1}>
          {item.currentLocation?.name ?? 'Sin ubicación'}
        </Text>
        <Text className="mt-0.5 text-xs text-textMuted">
          Desde {sinceLabel(match)} · {usageLabel(item.usageState)}
        </Text>
        {item.status === 'SOLD' ? (
          <View className="mt-1 self-start rounded-full bg-danger px-2.5 py-0.5">
            <Text className="text-[11px] text-dangerText">Vendido</Text>
          </View>
        ) : null}
      </View>
      <View className="justify-center pr-3">
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

// "¿Ya lo tengo?" (plan §5.1): foto → la IA identifica el objeto → se compara con
// la colección. Si no existe se ofrece agregarlo o mandarlo a la wishlist.
export default function YaLoTengoScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<'buscar' | 'coleccion' | 'wishlist' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);

  const addPhotos = (uris: string[]) => {
    setPhotos((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
    setAdding(false);
  };

  const onCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      addPhotos([picture.uri]);
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

  const onSearch = async () => {
    if (!accessToken) return;
    setBusy('buscar');
    setError(null);
    try {
      setResult(await identifyItemPhotos(accessToken, photos));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const startOver = () => {
    setResult(null);
    setPhotos([]);
    setError(null);
  };

  // Lo detectado pasa al formulario de alta, igual que en el flujo de captura.
  const onAddToCollection = async () => {
    if (!accessToken || !result) return;
    setBusy('coleccion');
    setError(null);
    try {
      const photoUrls = await uploadItemPhotos(accessToken, photos);
      setItemDraft({
        values: itemFormFromExtracted(result.extracted),
        photoUrls,
        suggestedTags: result.extracted.suggestedTags ?? [],
        notice: 'Revisa lo que detectó la IA y corrige lo que haga falta.',
      });
      router.replace('/(tabs)/objetos/new');
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
          Frikidex necesita la cámara para reconocer el objeto y ver si ya lo tienes.
        </Text>
        <View className="w-full">
          <Button label="Permitir cámara" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  if (result) {
    const [best, ...others] = result.matches;
    const alreadyOwned = result.hasMatch && best;
    const similar = alreadyOwned ? others : result.matches;
    const detected = result.extracted.name;

    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      >
        {detected ? (
          <Text className="mb-4 text-sm text-textMuted">
            Detectamos: <Text className="text-textSecondary">{detected}</Text>. La IA puede equivocarse.
          </Text>
        ) : (
          <Text className="mb-4 text-sm text-textMuted">No pudimos reconocer el objeto con claridad.</Text>
        )}

        {alreadyOwned ? (
          <>
            <Text className="mb-3 font-display text-2xl uppercase tracking-wide text-primary">¡Ya lo tienes!</Text>
            <MatchCard match={best} highlight onOpen={() => router.push(`/(tabs)/objetos/${best.item.id}`)} />
          </>
        ) : (
          <View className="mb-2">
            <Text className="mb-1 font-display text-2xl uppercase tracking-wide text-text">Parece que no lo tienes</Text>
            <Text className="mb-4 text-sm text-textMuted">¿Qué quieres hacer con él?</Text>
            {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}
            <View className="gap-3">
              <Button label="Agregar a mi colección" onPress={onAddToCollection} loading={busy === 'coleccion'} disabled={busy === 'wishlist'} />
              <Button label="Agregar a mi wishlist" variant="secondary" onPress={onAddToWishlist} loading={busy === 'wishlist'} disabled={busy === 'coleccion'} />
              <Button label="Cancelar" variant="ghost" onPress={() => router.back()} disabled={busy !== null} />
            </View>
          </View>
        )}

        {similar.length > 0 ? (
          <View className="mt-6">
            <Text className="mb-3 font-body-bold text-lg text-text">Objetos similares</Text>
            {similar.map((match) => (
              <MatchCard key={match.item.id} match={match} onOpen={() => router.push(`/(tabs)/objetos/${match.item.id}`)} />
            ))}
          </View>
        ) : result.matches.length === 0 && !result.soldMatches.length ? (
          <Text className="mt-6 text-sm text-textMuted">
            Todavía no tienes objetos parecidos. Entra a Objetos para cargar artículos a tu colección.
          </Text>
        ) : null}

        {result.soldMatches.length > 0 ? (
          <View className="mt-6">
            <Text className="mb-3 font-body-bold text-lg text-text">Objetos vendidos que se relacionan</Text>
            {result.soldMatches.map((match) => (
              <MatchCard key={match.item.id} match={match} onOpen={() => router.push(`/(tabs)/objetos/${match.item.id}`)} />
            ))}
          </View>
        ) : null}

        {alreadyOwned ? (
          <View className="mt-6 gap-3">
            {error ? <Text className="text-sm text-danger">{error}</Text> : null}
            <Button label="Escanear otro objeto" variant="ghost" onPress={startOver} disabled={busy !== null} />
            <Pressable onPress={onAddToCollection} disabled={busy !== null} className="items-center py-2">
              <Text className="text-sm text-textMuted underline">
                {busy === 'coleccion' ? 'Subiendo fotos…' : 'Es otro distinto: agregarlo de todos modos'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-6">
            <Button label="Escanear otro objeto" variant="ghost" onPress={startOver} disabled={busy !== null} />
          </View>
        )}
      </ScrollView>
    );
  }

  if (photos.length > 0 && !adding) {
    return (
      <View className="flex-1 bg-backgroundDeep" style={{ paddingTop: insets.top + 56 }}>
        <View className="flex-1 px-5">
          <Image source={{ uri: photos[photos.length - 1] }} style={{ flex: 1, borderRadius: 16 }} resizeMode="contain" />
          <ScrollView horizontal className="mt-3 max-h-20 flex-grow-0" showsHorizontalScrollIndicator={false}>
            {photos.map((uri, index) => (
              <View key={uri} className="mr-2 pt-1">
                <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 10 }} />
                <Pressable
                  onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                  disabled={busy !== null}
                  className="absolute -right-1 top-0 h-5 w-5 items-center justify-center rounded-full bg-danger"
                >
                  <Ionicons name="close" size={13} color={colors.primaryText} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 20, paddingTop: 16 }}>
          {error ? <Text className="text-center text-sm text-danger">{error}</Text> : null}
          <Button label="Buscar en mi colección" onPress={onSearch} loading={busy === 'buscar'} />
          {photos.length < MAX_PHOTOS ? (
            <Button label="Agregar otra foto" variant="ghost" onPress={() => setAdding(true)} disabled={busy !== null} />
          ) : null}
          <Text className="text-center text-xs text-textMuted">
            Al buscar, la foto se envía a un servicio de IA para reconocer el objeto.
          </Text>
        </View>
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
            <Pressable
              onPress={() => router.replace('/(tabs)/objetos/captura')}
              className="h-12 items-center justify-center rounded-full bg-background/70 px-4"
            >
              <Text className="text-sm text-white">Objeto nuevo</Text>
            </Pressable>
          )}
        </View>
        {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}
      </View>
    </View>
  );
}
