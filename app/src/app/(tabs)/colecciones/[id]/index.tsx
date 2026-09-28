import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import {
  fetchCollection,
  fetchCollectionShare,
  shareCollection,
  unshareCollection,
  type Collection,
} from '../../../../lib/collections';
import { fetchItems, isAwayFromPermanent, type Item } from '../../../../lib/items';
import { colors } from '../../../../theme/tokens';

const GRID_GAP = 3;
const COLUMNS = 3;
const SIDE_PADDING = 16;

const STATUS_TAG: Record<string, string> = {
  PENDING_TRANSFER: 'En transferencia',
  DONATED: 'Donado',
  LOST: 'Perdido',
};

function ItemTile({ item, size, onOpen }: { item: Item; size: number; onOpen: () => void }) {
  const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
  const tag = item.saleStatus === 'FOR_SALE' ? 'En venta' : item.saleStatus === 'RESERVED' ? 'Apartado' : STATUS_TAG[item.status];

  return (
    <Pressable
      onPress={onOpen}
      accessibilityLabel={item.name}
      style={{ width: size, height: size }}
      className="overflow-hidden bg-surfaceElevated active:opacity-80"
    >
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <Ionicons name="image-outline" size={26} color={colors.textMuted} />
        </View>
      )}
      {tag ? (
        <View className="absolute inset-x-0 bottom-0 bg-background/80 px-1.5 py-0.5">
          <Text className="text-[10px] font-bold uppercase text-text" numberOfLines={1}>
            {tag}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [collection, setCollection] = useState<Omit<Collection, 'itemCount'> | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setError(null);
      const [found, list, share] = await Promise.all([
        fetchCollection(accessToken, id),
        fetchItems(accessToken, { collectionId: id }),
        fetchCollectionShare(accessToken, id).catch(() => ({ shared: false, url: null })),
      ]);
      setCollection(found);
      setItems(list);
      setShared(share.shared);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onShare = async () => {
    if (!accessToken || !collection) return;
    setSharing(true);
    setError(null);
    try {
      const { url } = await shareCollection(accessToken, collection.id);
      setShared(true);
      // Igual que en el objeto: la URL va una sola vez dentro de `message` (en iOS,
      // pasar también `url` hace que varias apps la dupliquen).
      await Share.share({ message: `Mira mi colección "${collection.name}" en Frikidex: ${url}` });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

  const onUnshare = () => {
    if (!accessToken || !collection) return;
    Alert.alert('Dejar de compartir', 'El enlace de esta colección dejará de abrirse para todos. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Dejar de compartir',
        style: 'destructive',
        onPress: async () => {
          try {
            await unshareCollection(accessToken, collection.id);
            setShared(false);
          } catch (err) {
            setError(authErrorMessage(err));
          }
        },
      },
    ]);
  };

  if (collection === null || items === null) {
    if (error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
          <Text className="text-center text-sm text-danger">{error}</Text>
          <Button label="Reintentar" onPress={load} />
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const tileSize = Math.floor((width - SIDE_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);
  const awayCount = items.filter(isAwayFromPermanent).length;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, paddingHorizontal: SIDE_PADDING }}
    >
      <Stack.Screen options={{ title: collection.name }} />

      <Text className="mb-4 text-sm text-textMuted">
        {items.length === 1 ? '1 objeto' : `${items.length} objetos`}
      </Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {items.length === 0 ? (
        <Text className="my-10 text-center text-sm text-textMuted">Esta colección todavía no tiene objetos.</Text>
      ) : (
        <View className="mb-6 flex-row flex-wrap" style={{ gap: GRID_GAP }}>
          {items.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              size={tileSize}
              onOpen={() => router.push(`/(tabs)/objetos/${item.id}`)}
            />
          ))}
        </View>
      )}

      <View className="gap-3">
        <Button label="Compartir colección" onPress={onShare} loading={sharing} disabled={items.length === 0} />
        {shared ? <Button label="Dejar de compartir" variant="ghost" onPress={onUnshare} /> : null}
        <Button
          label="Reubicar colección"
          variant="secondary"
          onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/ubicacion`)}
          disabled={items.length === 0}
        />
        <Button
          label={
            awayCount > 0
              ? `Regresar colección a su ubicación permanente (${awayCount})`
              : 'Regresar colección a su ubicación permanente'
          }
          variant="ghost"
          onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/regresar`)}
          disabled={items.length === 0}
        />
      </View>
    </ScrollView>
  );
}
