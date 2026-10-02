import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { rotatePhoto } from '../../lib/image';
import { colors } from '../../theme/tokens';
import { ImageCropper } from './ImageCropper';

interface PhotoPreviewProps {
  photos: string[];
  setPhotos: (updater: (prev: string[]) => string[]) => void;
  disabled?: boolean;
}

// Preview de las fotos recién tomadas (captura y ¿Ya lo tengo?): foto grande
// con botón para girarla 90° (por si quedó acostada) + tira de miniaturas para
// elegir cuál ver/girar y quitar las que no sirvan.
export function PhotoPreview({ photos, setPhotos, disabled }: PhotoPreviewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [rotating, setRotating] = useState(false);
  const [cropping, setCropping] = useState(false);

  // Al agregar/quitar fotos, la vista vuelve a la última.
  useEffect(() => setSelected(null), [photos.length]);

  const shownIndex = selected !== null && selected < photos.length ? selected : photos.length - 1;

  const onRotate = async () => {
    const index = shownIndex;
    setRotating(true);
    try {
      const rotated = await rotatePhoto(photos[index]);
      setPhotos((prev) => prev.map((uri, i) => (i === index ? rotated : uri)));
    } catch {
      // Si falla, la foto se queda como estaba.
    } finally {
      setRotating(false);
    }
  };

  return (
    <>
      <View className="flex-1">
        <Image source={{ uri: photos[shownIndex] }} style={{ flex: 1, borderRadius: 16 }} resizeMode="contain" />
        <Pressable
          onPress={() => setCropping(true)}
          disabled={disabled || rotating}
          accessibilityLabel="Recortar foto"
          className="absolute bottom-3 right-16 h-11 w-11 items-center justify-center rounded-full bg-black/60 active:opacity-80"
        >
          <Ionicons name="crop" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={onRotate}
          disabled={disabled || rotating}
          accessibilityLabel="Girar foto"
          className="absolute bottom-3 right-3 h-11 w-11 items-center justify-center rounded-full bg-black/60 active:opacity-80"
        >
          {rotating ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Ionicons name="refresh" size={22} color={colors.text} />
          )}
        </Pressable>
      </View>
      {cropping ? (
        <ImageCropper
          uri={photos[shownIndex]}
          onCancel={() => setCropping(false)}
          onConfirm={(croppedUri) => {
            const index = shownIndex;
            setPhotos((prev) => prev.map((uri, i) => (i === index ? croppedUri : uri)));
            setCropping(false);
          }}
        />
      ) : null}
      <ScrollView horizontal className="mt-3 max-h-20 flex-grow-0" showsHorizontalScrollIndicator={false}>
        {photos.map((uri, index) => (
          <View key={uri} className="mr-2 pt-1">
            <Pressable onPress={() => setSelected(index)} disabled={rotating}>
              <Image
                source={{ uri }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: index === shownIndex ? colors.primary : 'transparent',
                }}
              />
            </Pressable>
            <Pressable
              onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
              disabled={disabled || rotating}
              className="absolute -right-1 top-0 h-5 w-5 items-center justify-center rounded-full bg-danger"
            >
              <Ionicons name="close" size={13} color={colors.primaryText} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
