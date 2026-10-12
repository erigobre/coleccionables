import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { fetchItems, type Item } from '../../../../lib/items';
import { fetchCollectionSeasonAssignments, type CollectionSeasonAssignment } from '../../../../lib/seasons';
import { colors } from '../../../../theme/tokens';

const GRID_GAP = 3;
const COLUMNS = 3;
const SIDE_PADDING = 16;

const STATUS_TAG: Record<string, string> = {
  PENDING_TRANSFER: 'En transferencia',
  DONATED: 'Donado',
  LOST: 'Perdido',
};

// El botón "Regresar ubicación" solo aplica cuando toda la colección quedó en una
// ubicación temporal: todos sus objetos activos comparten ubicación actual y
// temporada, y están marcados como TEMPORAL.
function isWholeCollectionTemporary(items: Item[]): boolean {
  const active = items.filter((item) => item.status === 'ACTIVE');
  if (active.length === 0) return false;
  const [first] = active;
  return active.every(
    (item) =>
      item.locationAssignment === 'TEMPORAL' &&
      item.currentSeasonId !== null &&
      item.currentSeasonId === first.currentSeasonId &&
      item.currentLocationId === first.currentLocationId,
  );
}

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
  const insets = useSafeAreaInsets();

  const [collection, setCollection] = useState<Omit<Collection, 'itemCount'> | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [seasonAssignments, setSeasonAssignments] = useState<CollectionSeasonAssignment[]>([]);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setError(null);
      const [found, list, share, assignments] = await Promise.all([
        fetchCollection(accessToken, id),
        fetchItems(accessToken, { collectionId: id }),
        fetchCollectionShare(accessToken, id).catch(() => ({ shared: false, url: null })),
        fetchCollectionSeasonAssignments(accessToken, id).catch(() => []),
      ]);
      setCollection(found);
      setItems(list);
      setShared(share.shared);
      setSeasonAssignments(assignments);
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
  const showReturn = isWholeCollectionTemporary(items);

  // Mover: solo mientras la temporada está activa y todavía hay objetos sin mover.
  // Regresar: en cuanto queden objetos sin devolver, sin importar si ya empezó la
  // siguiente ocurrencia (evita que se quede "atorado" esperando a que vuelva a tocar).
  const seasonBanners = seasonAssignments
    .map((assignment) => {
      if (assignment.phase === 'ACTIVE' && assignment.pendingStartCount > 0) {
        return { assignment, direction: 'start' as const };
      }
      if (assignment.pendingEndCount > 0) {
        return { assignment, direction: 'end' as const };
      }
      return null;
    })
    .filter((v): v is { assignment: CollectionSeasonAssignment; direction: 'start' | 'end' } => v !== null);

  return (
    <View className="flex-1 bg-background">
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 240, paddingHorizontal: SIDE_PADDING }}
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

      {seasonBanners.map(({ assignment, direction }) => (
        <Pressable
          key={`${assignment.id}-${direction}`}
          onPress={() =>
            router.push(
              `/(tabs)/colecciones/${collection.id}/temporada-checklist?assignmentId=${assignment.id}&direction=${direction}`,
            )
          }
          className="mb-4 flex-row items-center gap-3 rounded-lg border border-primary bg-surfaceElevated px-4 py-3 active:opacity-80"
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <View className="flex-1">
            <Text className="font-body-bold text-sm text-text">
              {direction === 'start' ? `"${assignment.season.name}" empezó` : `"${assignment.season.name}" terminó`}
            </Text>
            <Text className="text-xs text-textMuted">
              {direction === 'start'
                ? `Mueve ${assignment.pendingStartCount === 1 ? '1 objeto' : `${assignment.pendingStartCount} objetos`} a "${assignment.destinationLocation.name}"`
                : `Regresa ${assignment.pendingEndCount === 1 ? '1 objeto' : `${assignment.pendingEndCount} objetos`} a su ubicación principal`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      ))}

      <View className="gap-3">
        <Button
          label="Reubicar colección"
          variant="secondary"
          onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/ubicacion`)}
          disabled={items.length === 0}
        />
        <Button
          label="Temporadas de esta colección"
          variant="ghost"
          onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/temporadas`)}
        />
        {showReturn ? (
          <Button
            label="Regresar ubicación"
            variant="ghost"
            onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/regresar`)}
          />
        ) : null}
        {shared ? (
          <Pressable onPress={onUnshare} className="items-center py-2">
            <Text className="text-xs text-textMuted underline">Dejar de compartir el enlace público</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>

      {items.length > 0 ? (
        <Pressable
          onPress={onShare}
          disabled={sharing}
          accessibilityLabel="Compartir colección"
          className="absolute h-14 w-14 items-center justify-center rounded-full bg-secondary shadow-lg"
          style={{ right: 20, bottom: insets.bottom + (collection.isSystem ? 96 : 164) }}
        >
          {sharing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name="share-social" size={24} color={colors.white} />
          )}
        </Pressable>
      ) : null}
      {!collection.isSystem ? (
        <Pressable
          onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/edit`)}
          accessibilityLabel="Editar colección"
          className="absolute h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
          style={{ right: 20, bottom: insets.bottom + 96 }}
        >
          <Ionicons name="pencil" size={22} color={colors.primaryText} />
        </Pressable>
      ) : null}
      {!collection.isSystem ? (
        <Pressable
          onPress={() => router.push(`/(tabs)/colecciones/${collection.id}/miembros`)}
          accessibilityLabel="Miembros de la colección"
          className="absolute h-14 w-14 items-center justify-center rounded-full bg-surfaceElevated shadow-lg"
          style={{ right: 20, bottom: insets.bottom + 232 }}
        >
          <Ionicons name="people" size={22} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}
