import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { authErrorMessage } from '../../context/auth-context';
import { resolvePhotoUrl } from '../../lib/api';
import { addItemPhotos, removeItemPhoto, uploadItemPhotos, type ItemPhoto } from '../../lib/items';
import { colors } from '../../theme/tokens';

const MAX_PHOTOS = 8;

interface PhotoManagerProps {
  accessToken: string;
  itemId: string;
  photos: ItemPhoto[];
  // Se llama tras agregar o quitar para que la pantalla recargue las fotos.
  onChanged: () => Promise<void>;
}

// Las fotos se guardan al momento (endpoints propios del backend), no con el
// botón "Guardar cambios" del formulario.
export function PhotoManager({ accessToken, itemId, photos, onChanged }: PhotoManagerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addFromPicker = (result: ImagePicker.ImagePickerResult) =>
    run(async () => {
      if (result.canceled) return;
      const urls = await uploadItemPhotos(accessToken, result.assets.map((asset) => asset.uri));
      await addItemPhotos(accessToken, itemId, urls);
    });

  const onCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Permite el acceso a la cámara para tomar la foto.');
      return;
    }
    await addFromPicker(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }));
  };

  const onGallery = async () => {
    await addFromPicker(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 0.8,
      }),
    );
  };

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-medium text-textSecondary">
        Fotos ({photos.length}/{MAX_PHOTOS})
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
        {photos.map((photo) => (
          <View key={photo.id} className="mr-3 pt-1">
            <Image source={{ uri: resolvePhotoUrl(photo.url) }} style={{ width: 96, height: 96, borderRadius: 12 }} />
            <Pressable
              onPress={() => run(() => removeItemPhoto(accessToken, itemId, photo.id))}
              disabled={busy}
              className="absolute -right-1 top-0 h-6 w-6 items-center justify-center rounded-full bg-danger"
            >
              <Ionicons name="close" size={14} color={colors.primaryText} />
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <>
            <Pressable
              onPress={onCamera}
              disabled={busy}
              className="mr-3 mt-1 h-24 w-24 items-center justify-center rounded-xl border border-dashed border-border bg-surface"
            >
              <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
              <Text className="mt-1 text-xs text-textMuted">Cámara</Text>
            </Pressable>
            <Pressable
              onPress={onGallery}
              disabled={busy}
              className="mt-1 h-24 w-24 items-center justify-center rounded-xl border border-dashed border-border bg-surface"
            >
              <Ionicons name="images-outline" size={26} color={colors.textMuted} />
              <Text className="mt-1 text-xs text-textMuted">Galería</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
      {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} /> : null}
      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
