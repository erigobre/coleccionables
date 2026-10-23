import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import { addItemToCollection, fetchItems, removeItemFromCollection, type Item } from '../../../../lib/items';
import { colors } from '../../../../theme/tokens';

function ItemRow({
  item,
  linked,
  busy,
  onToggle,
}: {
  item: Item;
  linked: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;

  return (
    <Pressable
      onPress={onToggle}
      disabled={busy}
      className="flex-row items-center gap-3 border-b border-border py-3"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <View className="h-12 w-12 overflow-hidden rounded-md bg-surfaceElevated">
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="image-outline" size={18} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text className="flex-1 text-sm text-text" numberOfLines={1}>
        {item.name}
      </Text>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons
          name={linked ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={linked ? colors.primary : colors.textMuted}
        />
      )}
    </Pressable>
  );
}

export default function CollectionManageItemsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    fetchItems(accessToken, {})
      .then(setItems)
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  const trimmedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(
    () => (items ?? []).filter((item) => item.name.toLowerCase().includes(trimmedQuery)),
    [items, trimmedQuery],
  );

  const onToggle = async (item: Item) => {
    if (!accessToken || !id || busyId) return;
    const linked = item.collections.some((c) => c.collectionId === id);
    setBusyId(item.id);
    setError(null);
    try {
      if (linked) {
        await removeItemFromCollection(accessToken, item.id, id);
        setItems((prev) =>
          (prev ?? []).map((it) =>
            it.id === item.id ? { ...it, collections: it.collections.filter((c) => c.collectionId !== id) } : it,
          ),
        );
      } else {
        await addItemToCollection(accessToken, item.id, id);
        setItems((prev) =>
          (prev ?? []).map((it) =>
            it.id === item.id
              ? { ...it, collections: [...it.collections, { collectionId: id } as Item['collections'][number]] }
              : it,
          ),
        );
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 px-5 pt-3">
        <View className="mb-4 h-12 flex-row items-center rounded-md border border-border bg-surfaceElevated px-3">
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre…"
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

        {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}

        {items === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon={trimmedQuery ? 'search-outline' : 'cube-outline'}
            title={trimmedQuery ? 'Sin resultados' : 'No tienes objetos propios'}
            description={
              trimmedQuery
                ? 'Ningún objeto coincide con tu búsqueda.'
                : 'Los objetos que agregues tú mismo aparecerán aquí.'
            }
          />
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
            {visibleItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                linked={item.collections.some((c) => c.collectionId === id)}
                busy={busyId === item.id}
                onToggle={() => onToggle(item)}
              />
            ))}
          </ScrollView>
        )}

        <View className="pb-4 pt-3">
          <Button label="Listo" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}
