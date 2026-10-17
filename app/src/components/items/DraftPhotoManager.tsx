import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { authErrorMessage } from '../../context/auth-context';
import { resolvePhotoUrl } from '../../lib/api';
import { uploadItemPhotos } from '../../lib/items';
import { colors } from '../../theme/tokens';
import { ImageCropper } from '../ui/ImageCropper';
import { MAX_PHOTOS } from './PhotoManager';

interface DraftPhotoManagerProps {
  accessToken: string;
  photoUrls: string[];
  onChange: (urls: string[]) => void;
}

// Equivalente a PhotoManager pero para un objeto que todavía no existe (alta
// manual, o clonar): las fotos ya se suben a /storage/upload para poder
// previsualizarlas/recortarlas, pero el arreglo de URLs vive en memoria hasta
// que se guarde el objeto — no hay itemId todavía para los endpoints de
// agregar/quitar foto.
export function DraftPhotoManager({ accessToken, photoUrls, onChange }: DraftPhotoManagerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropJob, setCropJob] = useState<{ queue: string[]; results: string[] } | null>(null);
  const [existingCrop, setExistingCrop] = useState<{ url: string; uri: string } | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadNewPhotos = (uris: string[]) =>
    run(async () => {
      const urls = await uploadItemPhotos(accessToken, uris);
      onChange([...photoUrls, ...urls]);
    });

  const addFromPicker = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    setCropJob({ queue: result.assets.map((asset) => asset.uri), results: [] });
  };

  const onCropQueueResolved = (uri: string) => {
    if (!cropJob) return;
    const results = [...cropJob.results, uri];
    const queue = cropJob.queue.slice(1);
    if (queue.length === 0) {
      setCropJob(null);
      uploadNewPhotos(results);
    } else {
      setCropJob({ queue, results });
    }
  };

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
        selectionLimit: MAX_PHOTOS - photoUrls.length,
        quality: 0.8,
      }),
    );
  };

  return (
    <View className="mb-6">
      <Text className="mb-2 text-sm font-medium text-textSecondary">
        Fotos ({photoUrls.length}/{MAX_PHOTOS})
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
        {photoUrls.map((url) => (
          <View key={url} className="mr-3 pt-1">
            <Image source={{ uri: resolvePhotoUrl(url) }} style={{ width: 96, height: 96, borderRadius: 12 }} />
            <Pressable
              onPress={() => setExistingCrop({ url, uri: resolvePhotoUrl(url) })}
              disabled={busy}
              accessibilityLabel="Recortar foto"
              className="absolute bottom-1 left-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
            >
              <Ionicons name="crop" size={13} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => onChange(photoUrls.filter((existing) => existing !== url))}
              disabled={busy}
              className="absolute -right-1 top-0 h-6 w-6 items-center justify-center rounded-full bg-danger"
            >
              <Ionicons name="close" size={14} color={colors.primaryText} />
            </Pressable>
          </View>
        ))}
        {photoUrls.length < MAX_PHOTOS ? (
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
      {cropJob ? (
        <ImageCropper
          uri={cropJob.queue[0]}
          onCancel={() => onCropQueueResolved(cropJob.queue[0])}
          onConfirm={onCropQueueResolved}
        />
      ) : null}
      {existingCrop ? (
        <ImageCropper
          uri={existingCrop.uri}
          onCancel={() => setExistingCrop(null)}
          onConfirm={(croppedUri) => {
            const { url } = existingCrop;
            setExistingCrop(null);
            run(async () => {
              const [newUrl] = await uploadItemPhotos(accessToken, [croppedUri]);
              onChange(photoUrls.map((existing) => (existing === url ? newUrl : existing)));
            });
          }}
        />
      ) : null}
    </View>
  );
}
