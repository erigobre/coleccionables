import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button } from '../../../../components/ui/Button';
import { ApiError, resolvePhotoUrl } from '../../../../lib/api';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { insufficientFtMessage, useFt } from '../../../../context/ft-context';
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
  peekMarketPrice,
  removeItemFromCollection,
  removeItemTag,
  shareItem,
  toggleFavorite,
  unshareItem,
  updateItem,
  type Item,
  type MarketPricePeek,
  type MarketPriceResult,
} from '../../../../lib/items';
import { fetchTags, type Tag } from '../../../../lib/tags';
import { cancelTransfer, fetchOutgoingTransfers, type OutgoingTransfer } from '../../../../lib/transfers';
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
  const { refresh: refreshFt } = useFt();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const pagerRef = useRef<ScrollView>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [pendingTransfer, setPendingTransfer] = useState<OutgoingTransfer | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [marketPeek, setMarketPeek] = useState<MarketPricePeek | null>(null);
  const [marketPrice, setMarketPrice] = useState<MarketPriceResult | null>(null);
  const [marketPriceInfo, setMarketPriceInfo] = useState<{ fetchedAt: string; fromCache: boolean } | null>(null);
  const [loadingMarketPrice, setLoadingMarketPrice] = useState<'cached' | 'fresh' | null>(null);
  const [applyingNotes, setApplyingNotes] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [fetchedItem, fetchedCollections, fetchedTags, peek] = await Promise.all([
        fetchItem(accessToken, id),
        fetchActiveCollections(accessToken),
        fetchTags(accessToken),
        peekMarketPrice(accessToken, id),
      ]);
      // Con el objeto en transferencia se busca a quién se envió, para poder cancelarla.
      let pending: OutgoingTransfer | null = null;
      if (fetchedItem.status === 'PENDING_TRANSFER') {
        const outgoing = await fetchOutgoingTransfers(accessToken);
        pending = outgoing.find((t) => t.itemId === fetchedItem.id && t.status === 'PENDING') ?? null;
      }
      setItem(fetchedItem);
      setCollections(fetchedCollections);
      setTags(fetchedTags);
      setPendingTransfer(pending);
      setMarketPeek(peek);
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

  const onCancelTransfer = async () => {
    if (!accessToken || !pendingTransfer) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelTransfer(accessToken, pendingTransfer.id);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const onShare = async () => {
    if (!accessToken || !item) return;
    setSharing(true);
    setError(null);
    setNotice(null);
    try {
      const { url } = await shareItem(accessToken, item.id);
      await Share.share({ message: `${item.name} — mira este objeto de mi colección en Frikidex: ${url}`, url });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

  const onUnshare = async () => {
    if (!accessToken || !item) return;
    setError(null);
    try {
      await unshareItem(accessToken, item.id);
      setNotice('Dejaste de compartir el enlace: ya no abre para nadie.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  // El usuario siempre elige entre reusar el dato guardado (más barato) o pedir
  // uno nuevo a Gemini (más caro pero al día); nunca se decide en silencio
  // (decisión confirmada con el owner 2026-09-22).
  const onLookupMarketPrice = async (mode: 'cached' | 'fresh') => {
    if (!accessToken || !item) return;
    setLoadingMarketPrice(mode);
    setError(null);
    try {
      const result = await lookupMarketPrice(accessToken, item.id, mode);
      setMarketPrice(result.market);
      setMarketPriceInfo({ fetchedAt: result.fetchedAt, fromCache: result.fromCache });
      refreshFt();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 402 ? insufficientFtMessage(err.details) : authErrorMessage(err));
    } finally {
      setLoadingMarketPrice(null);
    }
  };

  const formatMarketDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

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

  if (item === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-base text-textMuted">Este objeto ya no existe.</Text>
      </View>
    );
  }

  const statusLabel = STATUS_LABEL[item.status];

  // Como en Tinder: tocar el tercio izquierdo/derecho de la foto pasa a la
  // anterior/siguiente; el tercio central no hace nada. Deslizar sigue funcionando.
  const goToPhoto = (index: number) => {
    const next = Math.max(0, Math.min(item.photos.length - 1, index));
    pagerRef.current?.scrollTo({ x: next * screenWidth, animated: true });
    setPhotoIndex(next);
  };
  const onPhotoTap = (locationX: number) => {
    if (locationX < screenWidth * 0.35) goToPhoto(photoIndex - 1);
    else if (locationX > screenWidth * 0.65) goToPhoto(photoIndex + 1);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 80 }}>
      <View className="relative w-full bg-surface" style={{ aspectRatio: 4 / 5 }}>
        {item.photos.length > 0 ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
          >
            {item.photos.map((p) => (
              <Pressable key={p.id} onPress={(e) => onPhotoTap(e.nativeEvent.locationX)}>
                <Animated.View entering={FadeIn.duration(300)}>
                  <Image
                    source={{ uri: resolvePhotoUrl(p.url) }}
                    style={{ width: screenWidth, height: '100%' }}
                    resizeMode="cover"
                  />
                </Animated.View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
          </View>
        )}
        {item.photos.length > 1 ? (
          <View pointerEvents="none" className="absolute bottom-9 w-full flex-row justify-center gap-1.5">
            {item.photos.map((p, index) => (
              <View
                key={p.id}
                className={`h-2 w-2 rounded-full ${index === photoIndex ? 'bg-primary' : 'bg-white/50'}`}
              />
            ))}
          </View>
        ) : null}
        <Pressable
          onPress={onToggleFavorite}
          className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-background/70"
        >
          <Ionicons name={item.isFavorite ? 'heart' : 'heart-outline'} size={22} color={item.isFavorite ? colors.danger : colors.white} />
        </Pressable>
      </View>

      {/* Hoja que sube y solapa la foto, como el perfil de Tinder. */}
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        className="-mt-6 rounded-t-3xl bg-background px-5 pt-6"
      >
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
              {marketPriceInfo ? (
                <Text className="mt-2 text-[11px] text-textMuted">
                  {marketPriceInfo.fromCache ? 'Dato guardado del ' : 'Consultado hoy, '}
                  {formatMarketDate(marketPriceInfo.fetchedAt)}
                </Text>
              ) : null}

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

              <View className="mt-4">
                <Button
                  label={
                    marketPeek?.fresh.ftCost != null
                      ? `Consultar precio actualizado hoy (${marketPeek.fresh.ftCost} FT)`
                      : 'Consultar precio actualizado hoy'
                  }
                  variant="ghost"
                  onPress={() => onLookupMarketPrice('fresh')}
                  loading={loadingMarketPrice === 'fresh'}
                  disabled={loadingMarketPrice === 'cached'}
                />
              </View>
            </View>
          ) : marketPeek ? (
            <View className="gap-3">
              {marketPeek.cached ? (
                <>
                  <Text className="text-xs text-textMuted">
                    Ya tenemos una estimación de precio del {formatMarketDate(marketPeek.cached.fetchedAt)}.
                  </Text>
                  <Button
                    label={
                      marketPeek.cached.ftCost != null
                        ? `Usar ese dato (${marketPeek.cached.ftCost} FT)`
                        : 'Usar ese dato'
                    }
                    variant="secondary"
                    onPress={() => onLookupMarketPrice('cached')}
                    loading={loadingMarketPrice === 'cached'}
                    disabled={loadingMarketPrice === 'fresh'}
                  />
                </>
              ) : (
                <Text className="text-xs text-textMuted">
                  Todavía no hay una estimación guardada para este objeto.
                </Text>
              )}
              <Button
                label={
                  marketPeek.fresh.ftCost != null
                    ? `Consultar precio de hoy (${marketPeek.fresh.ftCost} FT)`
                    : 'Consultar precio de hoy'
                }
                variant={marketPeek.cached ? 'ghost' : 'secondary'}
                onPress={() => onLookupMarketPrice('fresh')}
                loading={loadingMarketPrice === 'fresh'}
                disabled={loadingMarketPrice === 'cached'}
              />
            </View>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>

        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
        {notice ? <Text className="mb-4 text-sm text-textSecondary">{notice}</Text> : null}

        {item.status === 'PENDING_TRANSFER' && pendingTransfer ? (
          <View className="mb-5 rounded-lg border border-primary bg-surface p-4">
            <Text className="mb-1 text-sm font-semibold text-text">Esperando respuesta</Text>
            <Text className="mb-4 text-xs text-textMuted">
              Enviado a {pendingTransfer.toUser.email}. Si no responde en{' '}
              {Math.max(0, Math.ceil((new Date(pendingTransfer.expiresAt).getTime() - Date.now()) / 86_400_000))} día(s),
              vuelve a ti.
            </Text>
            <Button label="Cancelar envío" variant="ghost" onPress={onCancelTransfer} loading={cancelling} />
          </View>
        ) : null}

        {editable ? (
          <View className="gap-3">
            <Button label="Editar objeto" onPress={() => router.push(`/(tabs)/objetos/${item.id}/edit`)} />
            <Button label="Cambiar ubicación" variant="secondary" onPress={() => router.push(`/(tabs)/objetos/${item.id}/ubicacion`)} />
            <Button label="Compartir enlace" variant="ghost" onPress={onShare} loading={sharing} />
            <Button label="Vendido" variant="ghost" onPress={() => router.push(`/(tabs)/objetos/${item.id}/vender`)} />
            <Button label="Eliminar objeto" variant="destructive" onPress={onDelete} loading={deleting} />
            <Pressable onPress={onUnshare} className="items-center py-2">
              <Text className="text-xs text-textMuted underline">Dejar de compartir el enlace público</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-center text-sm text-textMuted">
            Este objeto está {statusLabel.toLowerCase()} y no se puede editar.
          </Text>
        )}
      </Animated.View>
    </ScrollView>
  );
}
