import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import { scanLocation, type ScanLocationResult } from '../../../../lib/locations';
import { colors } from '../../../../theme/tokens';

// Escanear el QR de una ubicación muestra todo lo que hay en ella y en sus
// sub-ubicaciones (plan §5.5.3). Sirve también como checklist de inventario físico.
export default function EscanearUbicacionScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  // Evita procesar el mismo QR varias veces mientras la cámara sigue apuntando a él.
  const scannedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanLocationResult | null>(null);

  const onScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current || !accessToken) return;
    scannedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      setResult(await scanLocation(accessToken, data));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const scanAgain = () => {
    scannedRef.current = false;
    setResult(null);
    setError(null);
  };

  if (!permission) {
    return <View className="flex-1 bg-backgroundDeep" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-backgroundDeep px-8">
        <Ionicons name="qr-code-outline" size={48} color={colors.textMuted} />
        <Text className="mb-6 mt-4 text-center text-base text-textSecondary">
          Frikidex necesita la cámara para leer el QR de tus ubicaciones.
        </Text>
        <View className="w-full">
          <Button label="Permitir cámara" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  if (result) {
    const awayCount = result.items.filter((i) => i.currentLocationId !== result.location.id).length;
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 60, paddingHorizontal: 20 }}
      >
        <Text className="font-body-bold text-xl text-text">{result.location.name}</Text>
        <Text className="mb-5 mt-1 text-sm text-textMuted">
          {result.items.length === 0
            ? 'No hay objetos en esta ubicación ni en sus sub-ubicaciones.'
            : `${result.items.length} objeto(s) aquí y en sus sub-ubicaciones${
                awayCount > 0 ? ` · ${awayCount} fuera de lugar` : ''
              }.`}
        </Text>

        {result.items.map((item) => {
          const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
          const elsewhere = item.currentLocationId !== result.location.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/(tabs)/objetos/${item.id}`)}
              className="mb-3 flex-row items-center overflow-hidden rounded-xl bg-surface"
            >
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 64, height: 64 }} />
              ) : (
                <View style={{ width: 64, height: 64 }} className="items-center justify-center bg-surfaceElevated">
                  <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                </View>
              )}
              <View className="flex-1 px-3 py-2">
                <Text className="text-base text-text" numberOfLines={1}>
                  {item.name}
                </Text>
                {elsewhere ? (
                  <Text className="text-xs text-danger" numberOfLines={1}>
                    Ahora está en: {item.currentLocation?.name ?? 'Sin ubicación'}
                  </Text>
                ) : (
                  <Text className="text-xs text-textMuted">En su lugar</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginRight: 12 }} />
            </Pressable>
          );
        })}

        <View className="mt-3">
          <Button label="Escanear otro QR" variant="ghost" onPress={scanAgain} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1 bg-backgroundDeep">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />

      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View style={{ width: 240, height: 240 }} className="rounded-3xl border-4 border-primary" />
      </View>

      <View className="absolute inset-x-0 bottom-0 items-center px-6 pb-12">
        {busy ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 12 }} /> : null}
        {error ? (
          <View className="w-full gap-3">
            <Text className="text-center text-sm text-danger">{error}</Text>
            <Button label="Intentar de nuevo" onPress={scanAgain} />
          </View>
        ) : (
          <Text className="text-center text-base text-white">Apunta al QR pegado en la ubicación</Text>
        )}
      </View>
    </View>
  );
}
