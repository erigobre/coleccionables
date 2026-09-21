import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { resolvePhotoUrl } from '../../../../lib/api';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { fetchActiveCollections, type Collection } from '../../../../lib/collections';
import {
  categoryLabel,
  conservationLabel,
  packagingLabel,
  usageLabel,
} from '../../../../lib/item-enums';
import {
  addItemToCollection,
  addItemTag,
  deleteItem,
  fetchItem,
  lookupMarketPrice,
  removeItemFromCollection,
  removeItemTag,
  toggleFavorite,
  updateItem,
  type Item,
  type MarketPriceResult,
} from '../../../../lib/items';
import { fetchTags, type Tag } from '../../../../lib/tags';
import { colors } from '../../../../theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '',
  PENDING_TRANSFER: 'En transferencia',
  SOLD: 'Vendido',
  DONATED: 'Donado',
  LOST: 'Perdido',
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View className="mb-3 flex-row justify-between border-b border-border pb-3">
      <Text className="text-sm text-textMuted">{label}</Text>
      <Text className="text-sm text-text">{value}</Text>
    </View>
  );
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [marketPrice, setMarketPrice] = useState<MarketPriceResult | null>(null);
  const [loadingMarketPrice, setLoadingMarketPrice] = useState(false);
  const [applyingNotes, setApplyingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [fetchedItem, fetchedCollections, fetchedTags] = await Promise.all([
        fetchItem(accessToken, id),
        fetchActiveCollections(accessToken),
        fetchTags(accessToken),
      ]);
      setItem(fetchedItem);
      setCollections(fetchedCollections);
      setTags(fetchedTags);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const editable = item?.status === 'ACTIVE';

  const onToggleFavorite = async () => {
    if (!accessToken || !item) return;
    setItem({ ...item, isFavorite: !item.isFavorite });
    try {
      await toggleFavorite(accessToken, item.id);
    } catch (err) {
      setError(authErrorMessage(err));
      await load();
    }
  };

  const onToggleCollection = async (collectionId: string) => {
    if (!accessToken || !item) return;
    const isLinked = item.collections.some((c) => c.collectionId === collectionId);
    try {
      if (isLinked) {
        await removeItemFromCollection(accessToken, item.id, collectionId);
      } else {
        await addItemToCollection(accessToken, item.id, collectionId);
      }
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const onToggleTag = async (tagId: string) => {
    if (!accessToken || !item) return;
    const isLinked = item.tags.some((t) => t.tagId === tagId);
    try {
      if (isLinked) {
        await removeItemTag(accessToken, item.id, tagId);
      } else {
        await addItemTag(accessToken, item.id, tagId);
      }
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const onDelete = async () => {
    if (!accessToken || !item) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteItem(accessToken, item.id);
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
      setDeleting(false);
    }
  };

  const onLookupMarketPrice = async () => {
    if (!accessToken || !item) return;
    setLoadingMarketPrice(true);
    setError(null);
    try {
      const result = await lookupMarketPrice(accessToken, item.id);
      setMarketPrice(result.market);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoadingMarketPrice(false);
    }
  };

  const onUseCollectorNotes = async () => {
    if (!accessToken || !item || !marketPrice?.collectorNotes) return;
    setApplyingNotes(true);
    setError(null);
    try {
      const newNotes = item.notes
        ? `${item.notes}\n\n${marketPrice.collectorNotes}`
        : marketPrice.collectorNotes;
      await updateItem(accessToken, item.id, { notes: newNotes });
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setApplyingNotes(false);
    }
  };

  if (item === undefined || collections === null || tags === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (item === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-base text-textMuted">Este objeto ya no existe.</Text>
      </View>
    );
  }

  const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
  const statusLabel = STATUS_LABEL[item.status];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 80 }}>
      <View className="relative w-full bg-surface" style={{ aspectRatio: 4 / 5 }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
          </View>
        )}
        <Pressable
          onPress={onToggleFavorite}
          className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-background/70"
        >
          <Ionicons name={item.isFavorite ? 'heart' : 'heart-outline'} size={22} color={item.isFavorite ? colors.danger : colors.white} />
        </Pressable>
      </View>

      <View className="px-5 pt-5">
        <Text className="font-body-bold text-2xl text-text">{item.name}</Text>
        {statusLabel ? (
          <View className="mt-2 self-start rounded-full bg-danger px-3 py-1">
            <Text className="text-xs text-dangerText">{statusLabel}</Text>
          </View>
        ) : null}

        <View className="my-5 rounded-lg border border-border bg-surface p-4">
          <InfoRow label="Categoría" value={categoryLabel(item.category)} />
          <InfoRow label="Empaque" value={packagingLabel(item.packagingCondition)} />
          <InfoRow label="Estado" value={usageLabel(item.usageState)} />
          <InfoRow label="Conservación" value={item.conservationState ? conservationLabel(item.conservationState) : null} />
          <InfoRow label="Marca" value={item.brand} />
          <InfoRow label="Línea/Modelo" value={item.toyLine} />
          <InfoRow label="Edición" value={item.edition} />
          <InfoRow label="Escala/Altura" value={item.scale} />
          <InfoRow label="Año de lanzamiento" value={item.releaseYear ? String(item.releaseYear) : null} />
          <InfoRow label="Precio de compra" value={item.purchasePrice ? `${item.purchasePrice} ${item.currency}` : null} />
          <InfoRow label="Cantidad" value={String(item.quantity)} />
          <InfoRow label="Ubicación actual" value={item.currentLocation?.name ?? 'Sin ubicación'} />
          {item.currentSeason ? <InfoRow label="Temporada" value={item.currentSeason.name} /> : null}
          {item.notes ? <InfoRow label="Notas" value={item.notes} /> : null}
        </View>

        <Text className="mb-2 text-sm font-semibold text-text">Colecciones</Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {collections.map((collection) => {
            const isLinked = item.collections.some((c) => c.collectionId === collection.id);
            return (
              <Pressable
                key={collection.id}
                onPress={() => onToggleCollection(collection.id)}
                disabled={!editable}
                className={`rounded-full border px-3 py-2 ${isLinked ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'}`}
              >
                <Text className={`text-sm ${isLinked ? 'text-primary' : 'text-textMuted'}`}>{collection.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-sm font-semibold text-text">Tags</Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {tags.map((tag) => {
            const isLinked = item.tags.some((t) => t.tagId === tag.id);
            return (
              <Pressable
                key={tag.id}
                onPress={() => onToggleTag(tag.id)}
                disabled={!editable}
                className={`rounded-full border px-3 py-2 ${isLinked ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'}`}
              >
                <Text className={`text-sm ${isLinked ? 'text-primary' : 'text-textMuted'}`}>{tag.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mb-5 rounded-lg border border-border bg-surface p-4">
          <Text className="mb-3 text-sm font-semibold text-text">Precio de mercado</Text>
          {marketPrice ? (
            <View>
              <Text className="text-sm text-text">
                {marketPrice.averagePrice != null ? `${marketPrice.averagePrice} ${marketPrice.currency}` : 'Sin precio disponible'}
              </Text>
              <Text className="mt-1 text-xs text-textMuted">{marketPrice.availability}</Text>
              <Text className="mt-2 text-xs text-textMuted">{marketPrice.summary}</Text>

              {marketPrice.collectorNotes ? (
                <View className="mt-4 border-t border-border pt-4">
                  <Text className="mb-2 text-sm font-semibold text-text">Dato para coleccionistas</Text>
                  <Text className="text-xs text-textMuted">{marketPrice.collectorNotes}</Text>
                  {editable ? (
                    <View className="mt-3">
                      <Button
                        label="Usar sugerencia en Notas"
                        variant="secondary"
                        onPress={onUseCollectorNotes}
                        loading={applyingNotes}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <Button
              label="Solicitar precio actual promedio de mercado"
              variant="secondary"
              onPress={onLookupMarketPrice}
              loading={loadingMarketPrice}
            />
          )}
        </View>

        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {editable ? (
          <View className="gap-3">
            <Button label="Editar objeto" onPress={() => router.push(`/(tabs)/objetos/${item.id}/edit`)} />
            <Button label="Cambiar ubicación" variant="secondary" onPress={() => router.push(`/(tabs)/objetos/${item.id}/ubicacion`)} />
            <Button label="Eliminar objeto" variant="destructive" onPress={onDelete} loading={deleting} />
          </View>
        ) : (
          <Text className="text-center text-sm text-textMuted">
            Este objeto está {statusLabel.toLowerCase()} y no se puede editar.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
