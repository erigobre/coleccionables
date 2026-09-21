import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { resolvePhotoUrl } from '../../../lib/api';
import { usageLabel } from '../../../lib/item-enums';
import { fetchItems, toggleFavorite, type Item } from '../../../lib/items';
import { colors } from '../../../theme/tokens';

function timeSinceLabel(item: Item): string {
  const raw = item.acquisitionDate ?? item.createdAt;
  const date = new Date(raw);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ItemCard({ item, onToggleFavorite, onOpen }: { item: Item; onToggleFavorite: () => void; onOpen: () => void }) {
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

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setItems(await fetchItems(accessToken, { favoritesOnly }));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, favoritesOnly]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {items === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title={favoritesOnly ? 'Sin favoritos todavía' : 'Todavía no hay objetos'}
            description={
              favoritesOnly
                ? 'Marca objetos con el corazón para verlos aquí.'
                : 'Usa el botón + para agregar tu primer objeto.'
            }
          />
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => onToggleFavorite(item)}
              onOpen={() => router.push(`/(tabs)/objetos/${item.id}`)}
            />
          ))
        )}
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
