import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { authErrorMessage, useAuth } from '../context/auth-context';
import { insufficientFtMessage, useFt } from '../context/ft-context';
import { ApiError } from '../lib/api';
import { setItemDraft } from '../lib/item-draft';
import { EMPTY_ITEM_FORM, itemFormFromExtracted } from '../lib/item-form';
import { analyzeItemPhotos, lookupBarcode, uploadItemPhotos } from '../lib/items';
import { colors } from '../theme/tokens';

const MAX_PHOTOS = 4;

type CaptureMode = 'foto' | 'codigo';

export default function CapturaScreen() {
  const { accessToken } = useAuth();
  const { costOf, refresh: refreshFt } = useFt();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);
  const scannedRef = useRef(false);

  const [mode, setMode] = useState<CaptureMode>('foto');
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  // Con fotos ya tomadas se muestra el preview; "adding" vuelve a la cámara.
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<'analizar' | 'manual' | 'codigo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goToForm = () => router.replace('/new');

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    addPhotos(result.assets.map((asset) => asset.uri));
  };

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || !accessToken) return;
    scannedRef.current = true;
    setBusy('codigo');
    setError(null);

    // El código siempre queda en "Identificador único"; si la búsqueda falla o no
    // encuentra nada, el usuario sigue al formulario con solo ese dato.
    let values = { ...EMPTY_ITEM_FORM, uniqueIdentifier: data };
    let suggestedTags: string[] = [];
    let notice = `Código leído: ${data}. No se encontró el producto; llena los datos manualmente.`;

    // Solo EAN/UPC numéricos se buscan; un QR con texto libre no se manda a la IA.
    if (/^\d{8,14}$/.test(data)) {
      try {
        const result = await lookupBarcode(accessToken, data);
        refreshFt();
        if (result.found) {
          values = { ...itemFormFromExtracted(result.extracted), uniqueIdentifier: data };
          suggestedTags = result.extracted.suggestedTags ?? [];
          notice = 'Producto encontrado por su código de barras. Revisa los datos, la IA puede equivocarse.';
        }
      } catch (err) {
        notice =
          err instanceof ApiError && err.status === 402
            ? `Código leído: ${data}. ${insufficientFtMessage(err.details)} Llena los datos manualmente.`
            : `Código leído: ${data}. No se pudo buscar el producto; llena los datos manualmente.`;
      }
    } else {
      notice = `Código leído: ${data}. Solo se buscan códigos EAN/UPC; llena los datos manualmente.`;
    }

    setItemDraft({ values, photoUrls: [], suggestedTags, notice });
    goToForm();
  };

  const onAnalyze = async () => {
    if (!accessToken) return;
    setBusy('analizar');
    setError(null);
    try {
      const { extracted, photoUrls } = await analyzeItemPhotos(accessToken, photos);
      refreshFt();
      setItemDraft({
        values: itemFormFromExtracted(extracted),
        photoUrls,
        suggestedTags: extracted.suggestedTags ?? [],
        notice: 'Revisa lo que detectó la IA y corrige lo que haga falta.',
      });
      goToForm();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 402 ? insufficientFtMessage(err.details) : authErrorMessage(err));
      setBusy(null);
    }
  };

  // El llenado manual no debe quedar bloqueado por un problema de red al subir
  // las fotos: si la subida falla, se sigue al formulario sin fotos (se pueden
  // agregar después desde el objeto ya creado) en vez de dejar al usuario
  // atrapado en la cámara sin forma de continuar.
  const onManual = async () => {
    if (!accessToken) return;
    setBusy('manual');
    setError(null);
    let photoUrls: string[] = [];
    let notice: string | undefined;
    try {
      photoUrls = await uploadItemPhotos(accessToken, photos);
    } catch {
      notice = 'No se pudieron subir las fotos por un problema de conexión; podrás agregarlas después desde el objeto.';
    }
    setItemDraft({ values: EMPTY_ITEM_FORM, photoUrls, suggestedTags: [], notice });
    goToForm();
  };

  if (!permission) {
    return <View className="flex-1 bg-backgroundDeep" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-backgroundDeep px-8">
        <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
        <Text className="mb-6 mt-4 text-center text-base text-textSecondary">
          Frikidex necesita la cámara para fotografiar tus objetos y leer códigos de barras.
        </Text>
        <View className="w-full gap-3">
          <Button label="Permitir cámara" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  // Preview + confirmación de calidad (plan §5.3.7-8).
  if (photos.length > 0 && !adding) {
    return (
      <View className="flex-1 bg-backgroundDeep" style={{ paddingTop: insets.top + 56 }}>
        <View className="flex-1 px-5">
          <Image
            source={{ uri: photos[photos.length - 1] }}
            style={{ flex: 1, borderRadius: 16 }}
            resizeMode="contain"
          />
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
          <Text className="mt-3 text-center text-sm text-textMuted">
            ¿Se ve bien iluminada y nítida? Si no, quítala y toma otra.
          </Text>
        </View>

        <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 20, paddingTop: 16 }}>
          {error ? <Text className="text-center text-sm text-danger">{error}</Text> : null}
          <View className="flex-row gap-3">
            <View style={{ flex: 8 }}>
              <Button
                label="Analizar"
                ftCost={costOf('CREATE_WITH_AI')}
                onPress={onAnalyze}
                loading={busy === 'analizar'}
                disabled={busy === 'manual'}
              />
            </View>
            <View style={{ flex: 4 }}>
              <Button
                label="+ 📷"
                variant="ghost"
                onPress={() => setAdding(true)}
                disabled={busy !== null || photos.length >= MAX_PHOTOS}
              />
            </View>
          </View>
          <Button
            label="Llenado manual"
            ftCost={0}
            variant="ghost"
            onPress={onManual}
            loading={busy === 'manual'}
            disabled={busy === 'analizar'}
          />
          <Text className="text-center text-xs text-textMuted">
            Al analizar, la foto se envía a un servicio de IA para reconocer el objeto.
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
        onBarcodeScanned={mode === 'codigo' && photos.length === 0 ? onBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
      />

      {busy === 'codigo' ? (
        <View className="absolute inset-0 items-center justify-center bg-backgroundDeep/80">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="mt-4 text-sm text-white">Buscando el producto…</Text>
        </View>
      ) : null}

      {mode === 'codigo' && photos.length === 0 && busy !== 'codigo' ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="h-40 w-72 rounded-2xl border-4 border-primary" />
          <Text className="mt-4 text-sm text-white">Apunta al código de barras</Text>
        </View>
      ) : null}

      <View className="absolute inset-x-0 bottom-0 items-center" style={{ paddingBottom: insets.bottom + 24 }}>
        {photos.length === 0 ? (
        <View className="mb-6 flex-row gap-2 rounded-full bg-background/70 p-1">
          {(['foto', 'codigo'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => {
                scannedRef.current = false;
                setMode(option);
              }}
              className={`rounded-full px-4 py-2 ${mode === option ? 'bg-primary' : ''}`}
            >
              <Text className={`text-sm ${mode === option ? 'text-primaryText' : 'text-white'}`}>
                {option === 'foto' ? 'Foto' : 'Código de barras'}
              </Text>
            </Pressable>
          ))}
        </View>
        ) : null}

        <View className="w-full flex-row items-center justify-around px-8">
          <Pressable
            onPress={onPickFromGallery}
            className="h-12 w-12 items-center justify-center rounded-full bg-background/70"
          >
            <Ionicons name="images-outline" size={24} color={colors.white} />
          </Pressable>

          {mode === 'foto' || photos.length > 0 ? (
            <Pressable
              onPress={onCapture}
              disabled={!cameraReady}
              className="h-20 w-20 items-center justify-center rounded-full border-4 border-white"
            >
              <View className="h-14 w-14 rounded-full bg-primary" />
            </Pressable>
          ) : (
            <View className="h-20 w-20" />
          )}

          {photos.length > 0 ? (
            <Pressable
              onPress={() => setAdding(false)}
              className="h-12 items-center justify-center rounded-full bg-background/70 px-4"
            >
              <Text className="text-sm text-white">Volver</Text>
            </Pressable>
          ) : (
            // Espaciador: mantiene centrado el disparador (mismo ancho que el
            // botón de galería del otro lado). El flujo siempre empieza con
            // fotos, así que aquí ya no van accesos directos a "Manual" ni
            // "¿Ya lo tengo?".
            <View className="h-12 w-12" />
          )}
        </View>

        {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}
      </View>
    </View>
  );
}
