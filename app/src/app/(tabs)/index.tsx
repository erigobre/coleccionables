import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { FtCoin } from '../../components/ui/FtCoin';
import { Screen } from '../../components/ui/Screen';
import { useAuth } from '../../context/auth-context';
import { useFt } from '../../context/ft-context';
import { resolvePhotoUrl } from '../../lib/api';
import { fetchItems, type Item } from '../../lib/items';
import { colors } from '../../theme/tokens';

function StatCard({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: number;
  onPress?: () => void;
  icon?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 rounded-lg border border-border bg-surface p-4">
      <Text className="font-display text-2xl text-text">{value}</Text>
      <View className="mt-1 flex-row items-center gap-1">
        <Text className="text-xs text-textMuted">{label}</Text>
        {icon ? <FtCoin size={11} /> : null}
      </View>
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
  const { accessToken } = useAuth();
  const { costOf, balance } = useFt();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scanCost = costOf('SCAN_HAVE_IT');

  const [items, setItems] = useState<Item[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      let active = true;
      // El resumen es informativo: si falla algo, se deja lo último que se cargó.
      fetchItems(accessToken)
        .then((loadedItems) => {
          if (!active) return;
          setItems(loadedItems);
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
    <View style={{ flex: 1 }}>
      <Screen>
      <View className="flex-row items-center gap-2.5">
        <Image
          source={require('../../../assets/icon.png')}
          style={{ width: 30, height: 30, borderRadius: 7 }}
        />
        <View>
          <Text className="font-display text-lg text-text">
            FRIKI<Text className="text-primary">DEX</Text>
          </Text>
          <Text className="text-[9px] uppercase tracking-widest text-textMuted">La dex de tus coleccionables</Text>
        </View>
      </View>

      {items === null ? (
        <ActivityIndicator className="mt-12" color={colors.primary} />
      ) : (
        <>
          <View className="mt-6 flex-row gap-3">
            <StatCard label="Objetos totales" value={items.length} onPress={() => router.push('/(tabs)/objetos')} />
            {balance != null ? <StatCard label="Tus FrikiTokens" value={balance} icon /> : null}
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
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text className="font-display text-xl uppercase tracking-wide text-white">¿Ya lo tengo?</Text>
                    {scanCost != null ? (
                      <View className="flex-row items-center gap-1">
                        <FtCoin size={12} />
                        <Text className="text-sm text-white">
                          {scanCost}
                          <Text style={{ fontSize: 9 }}>FT</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
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
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text className="font-display text-xl uppercase tracking-wide text-white">¿Ya lo tengo?</Text>
                    {scanCost != null ? (
                      <View className="flex-row items-center gap-1">
                        <FtCoin size={12} />
                        <Text className="text-sm text-white">
                          {scanCost}
                          <Text style={{ fontSize: 9 }}>FT</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
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

      <Pressable
        onPress={() => router.push('/captura')}
        className="absolute h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        style={{ right: 20, bottom: insets.bottom + 96 }}
      >
        <Ionicons name="add" size={30} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}
