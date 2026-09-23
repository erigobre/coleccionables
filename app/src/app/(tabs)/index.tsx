import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { useAuth } from '../../context/auth-context';
import { resolvePhotoUrl } from '../../lib/api';
import { fetchItems, type Item } from '../../lib/items';
import { fetchWishlist } from '../../lib/wishlist';
import { colors } from '../../theme/tokens';

function StatCard({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 rounded-lg border border-border bg-surface p-4">
      <Text className="font-display text-2xl text-text">{value}</Text>
      <Text className="mt-1 text-xs text-textMuted">{label}</Text>
    </Pressable>
  );
}

function FavoriteCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
  return (
    <Pressable onPress={onOpen} className="mr-3 overflow-hidden rounded-xl bg-surface" style={{ width: 132 }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 132, height: 132 }} resizeMode="cover" />
      ) : (
        <View style={{ width: 132, height: 132 }} className="items-center justify-center bg-surfaceElevated">
          <Ionicons name="image-outline" size={26} color={colors.textMuted} />
        </View>
      )}
      <Text className="font-body-bold px-2.5 py-2 text-sm text-text" numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const [items, setItems] = useState<Item[] | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      let active = true;
      // El resumen es informativo: si falla algo, se deja lo último que se cargó.
      Promise.all([fetchItems(accessToken), fetchWishlist(accessToken)])
        .then(([loadedItems, wishlist]) => {
          if (!active) return;
          setItems(loadedItems);
          setWishlistCount(wishlist.length);
        })
        .catch(() => {
          if (active) setItems((prev) => prev ?? []);
        });
      return () => {
        active = false;
      };
    }, [accessToken]),
  );

  const favorites = items?.filter((item) => item.isFavorite) ?? [];

  return (
    <Screen>
      <Text className="font-body-bold text-2xl text-text">Hola{firstName ? `, ${firstName}` : ''} 👋</Text>
      <Text className="mt-1 text-sm text-textMuted">Este es el resumen de tu colección</Text>

      {items === null ? (
        <ActivityIndicator className="mt-12" color={colors.primary} />
      ) : (
        <>
          <View className="mt-6 flex-row gap-3">
            <StatCard label="Objetos totales" value={items.length} onPress={() => router.push('/(tabs)/objetos')} />
            <StatCard label="En wishlist" value={wishlistCount} onPress={() => router.push('/(tabs)/wishlist')} />
          </View>

          {items.length === 0 ? (
            <>
              <View className="mt-8 rounded-xl border border-dashed border-border bg-surface p-6">
                <Text className="font-body-bold mb-1 text-lg text-text">Registra tu primer objeto</Text>
                <Text className="mb-5 text-sm text-textMuted">
                  Toma una foto y la IA rellena la ficha por ti. Después podrás ubicarlo, compartirlo o transferirlo.
                </Text>
                <Button label="Agregar objeto" onPress={() => router.push('/captura')} />
              </View>

              <Pressable
                onPress={() => router.push('/ya-lo-tengo')}
                className="mt-4 flex-row items-center rounded-xl bg-secondary p-5 active:bg-secondaryHover"
              >
                <View className="flex-1 pr-3">
                  <Text className="font-display text-xl uppercase tracking-wide text-white">¿Ya lo tengo?</Text>
                  <Text className="mt-1 text-sm text-white/80">
                    Fotografía algo que viste en una tienda y comprueba si ya está en tu colección.
                  </Text>
                </View>
                <Ionicons name="camera" size={32} color={colors.white} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => router.push('/ya-lo-tengo')}
                className="mt-8 flex-row items-center rounded-xl bg-secondary p-5 active:bg-secondaryHover"
              >
                <View className="flex-1 pr-3">
                  <Text className="font-display text-xl uppercase tracking-wide text-white">¿Ya lo tengo?</Text>
                  <Text className="mt-1 text-sm text-white/80">
                    Fotografía algo que viste en una tienda y comprueba si ya está en tu colección.
                  </Text>
                </View>
                <Ionicons name="camera" size={32} color={colors.white} />
              </Pressable>

              <View className="mt-8">
                <Text className="font-body-bold mb-3 text-lg text-text">Tus favoritos</Text>
                {favorites.length === 0 ? (
                  <Text className="text-sm text-textMuted">
                    Marca objetos con el corazón en tu lista y aparecerán aquí.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {favorites.map((item) => (
                      <FavoriteCard key={item.id} item={item} onOpen={() => router.push(`/(tabs)/objetos/${item.id}`)} />
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
