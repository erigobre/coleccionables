import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { resolvePhotoUrl } from '../../../lib/api';
import { usageLabel } from '../../../lib/item-enums';
import { fetchItems, fetchSoldItems, toggleFavorite, type Item } from '../../../lib/items';
import { fetchIncomingTransfers } from '../../../lib/transfers';
import { colors } from '../../../theme/tokens';

function timeSinceLabel(item: Item): string {
  const raw = item.acquisitionDate ?? item.createdAt;
  const date = new Date(raw);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Minúsculas y sin acentos, para que "camion" encuentre "Camión".
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matchesQuery(item: Item, query: string): boolean {
  const haystack = [
    item.name,
    item.brand,
    item.toyLine,
    item.edition,
    item.uniqueIdentifier,
    ...item.collections.map((c) => c.collection.name),
  ]
    .filter(Boolean)
    .map((value) => normalize(value as string))
    .join(' ');
  return haystack.includes(normalize(query));
}

interface ItemCardProps {
  item: Item;
  onOpen: () => void;
  onToggleFavorite?: () => void;
  // Los vendidos se ven como un perfil normal pero sin poder tocarse (plan §5.3.9.5).
  readOnly?: boolean;
}

function ItemCard({ item, onToggleFavorite, onOpen, readOnly }: ItemCardProps) {
  const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
  const collectionNames = item.collections.map((c) => c.collection.name).join(', ') || 'Sin colección';
  const locationName = item.currentLocation?.name ?? 'Sin ubicación';

  return (
    <View className="mb-4 flex-row overflow-hidden rounded-xl bg-surface">
      <View className="relative" style={{ width: 90, aspectRatio: 9 / 16 }}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-surfaceElevated">
            <Ionicons name="image-outline" size={26} color={colors.textMuted} />
          </View>
        )}
        {readOnly ? null : (
          <Pressable
            onPress={onToggleFavorite}
            className="absolute left-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-background/70"
          >
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={item.isFavorite ? colors.danger : colors.white}
            />
          </Pressable>
        )}
      </View>

      <View className="flex-1 justify-center px-3 py-2.5">
        <Text className="font-body-bold text-base text-text" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-0.5 text-xs text-textMuted" numberOfLines={1}>
          {collectionNames}
        </Text>
        <Text className="mt-1 text-xs text-textMuted">
          Desde {timeSinceLabel(item)} · {usageLabel(item.usageState)}
        </Text>
        <Text className="mt-0.5 text-xs text-textMuted" numberOfLines={1}>
          {locationName}
        </Text>
        {readOnly ? (
          <View className="mt-1.5 self-start rounded-full bg-danger px-2.5 py-0.5">
            <Text className="text-[11px] text-dangerText">Vendido</Text>
          </View>
        ) : null}
        <Pressable onPress={onOpen} className="mt-2 self-start">
          <Text className="text-sm font-medium text-primary">Ver más detalles</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ObjetosScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [incomingCount, setIncomingCount] = useState(0);
  const [query, setQuery] = useState('');
  const [soldItems, setSoldItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setItems(await fetchItems(accessToken, { favoritesOnly }));
    } catch (err) {
      setError(authErrorMessage(err));
    }
    // El aviso de transferencias es secundario: si falla no debe tapar la lista.
    fetchIncomingTransfers(accessToken)
      .then((incoming) => setIncomingCount(incoming.length))
      .catch(() => setIncomingCount(0));
  }, [accessToken, favoritesOnly]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // "Objetos vendidos que se relacionan con tu búsqueda": se piden al backend con
  // un pequeño retraso para no lanzar una consulta por cada letra tecleada.
  const trimmedQuery = query.trim();
  useEffect(() => {
    if (!accessToken || trimmedQuery.length < 2) {
      setSoldItems([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchSoldItems(accessToken, trimmedQuery)
        .then((sold) => {
          if (!cancelled) setSoldItems(sold);
        })
        .catch(() => {
          if (!cancelled) setSoldItems([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, trimmedQuery]);

  const visibleItems = items && trimmedQuery ? items.filter((item) => matchesQuery(item, trimmedQuery)) : items;

  const onToggleFavorite = async (item: Item) => {
    if (!accessToken) return;
    setItems((prev) => prev?.map((i) => (i.id === item.id ? { ...i, isFavorite: !i.isFavorite } : i)) ?? prev);
    try {
      await toggleFavorite(accessToken, item.id);
    } catch (err) {
      setError(authErrorMessage(err));
      await load();
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 20,
        }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-display text-[22px] uppercase tracking-wide text-text">Objetos</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push('/(tabs)/objetos/transferencias')}
              className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surfaceElevated"
            >
              <Ionicons name="swap-horizontal" size={17} color={incomingCount > 0 ? colors.primary : colors.textMuted} />
              {incomingCount > 0 ? (
                <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1">
                  <Text className="text-[10px] font-bold text-dangerText">{incomingCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => setFavoritesOnly((v) => !v)}
              className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                favoritesOnly ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'
              }`}
            >
              <Ionicons name={favoritesOnly ? 'heart' : 'heart-outline'} size={14} color={favoritesOnly ? colors.primary : colors.textMuted} />
              <Text className={`text-xs ${favoritesOnly ? 'text-primary' : 'text-textMuted'}`}>Favoritos</Text>
            </Pressable>
          </View>
        </View>

        {incomingCount > 0 ? (
          <Pressable
            onPress={() => router.push('/(tabs)/objetos/transferencias')}
            className="mb-4 flex-row items-center justify-between rounded-xl border border-primary bg-surface px-4 py-3"
          >
            <Text className="flex-1 text-sm text-text">
              ¡Acabas de recibir {incomingCount === 1 ? 'un objeto' : `${incomingCount} objetos`}! Acepta o rechaza.
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        ) : null}

        <View className="mb-4 h-12 flex-row items-center rounded-md border border-border bg-surfaceElevated px-3">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre, marca, línea…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            className="ml-2 flex-1 text-base text-text"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {items === null ? (
          error ? (
            <Button label="Reintentar" onPress={load} />
          ) : (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          )
        ) : visibleItems && visibleItems.length === 0 && soldItems.length === 0 ? (
          <EmptyState
            icon={trimmedQuery ? 'search-outline' : 'cube-outline'}
            title={trimmedQuery ? 'Sin resultados' : favoritesOnly ? 'Sin favoritos todavía' : 'Todavía no hay objetos'}
            description={
              trimmedQuery
                ? 'Ningún objeto coincide con tu búsqueda.'
                : favoritesOnly
                  ? 'Marca objetos con el corazón para verlos aquí.'
                  : 'Usa el botón + para agregar tu primer objeto.'
            }
          />
        ) : (
          visibleItems?.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => onToggleFavorite(item)}
              onOpen={() => router.push(`/(tabs)/objetos/${item.id}`)}
            />
          ))
        )}

        {soldItems.length > 0 ? (
          <View className="mt-4">
            <Text className="mb-3 text-sm font-semibold text-textSecondary">
              Objetos vendidos que se relacionan con tu búsqueda
            </Text>
            {soldItems.map((item) => (
              <ItemCard key={item.id} item={item} readOnly onOpen={() => router.push(`/(tabs)/objetos/${item.id}`)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/(tabs)/objetos/captura')}
        className="absolute h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        style={{ right: 20, bottom: insets.bottom + 96 }}
      >
        <Ionicons name="add" size={30} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}
