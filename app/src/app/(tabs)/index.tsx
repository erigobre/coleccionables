import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { FallingCoinsAnimation } from '../../components/ui/FallingCoinsAnimation';
import { FtCoin } from '../../components/ui/FtCoin';
import { LogoHorizontal } from '../../components/ui/LogoHorizontal';
import { Screen } from '../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../context/auth-context';
import { useFt } from '../../context/ft-context';
import { resolvePhotoUrl } from '../../lib/api';
import { fetchMyCollectionInvites } from '../../lib/collections';
import { fetchItems, type Item } from '../../lib/items';
import { fetchOnboardingStatus } from '../../lib/onboarding';
import { fetchMyInvites } from '../../lib/organizations';
import { colors } from '../../theme/tokens';

// Cuenta ascendente de 0 hasta `target` mientras `play` es true (usada para
// la revelación del regalo de bienvenida); fuera de eso solo refleja `target`
// tal cual, sin animar (ej. cuando el balance cambia por cualquier otro gasto).
function useCountUp(target: number, play: boolean, duration = 1600) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!play) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      setValue(Math.round(target * progress));
      if (progress < 1) timer = setTimeout(tick, 32);
    };
    tick();
    return () => clearTimeout(timer);
  }, [play, target, duration]);
  return value;
}

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
  const params = useLocalSearchParams<{ onboarded?: string }>();
  const insets = useSafeAreaInsets();
  const scanCost = costOf('SCAN_HAVE_IT');
  const collectibilityCost = costOf('COLLECTIBILITY_CHECK');

  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // El FT del regalo ya se otorgó en el registro (AuthService.register) —
  // esto solo pone en escena algo que ya pasó, nunca un segundo otorgamiento.
  // El parámetro de navegación solo aparece una vez, justo tras completar el
  // onboarding, así que basta con una bandera local (sin flag en backend).
  const checkedWelcomeGift = useRef(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeGiftAmount, setWelcomeGiftAmount] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const displayedBalance = useCountUp(balance ?? 0, celebrating);

  useEffect(() => {
    if (params.onboarded !== '1' || checkedWelcomeGift.current || !accessToken) return;
    checkedWelcomeGift.current = true;
    fetchOnboardingStatus(accessToken)
      .then((status) => {
        setWelcomeGiftAmount(status.welcomeGiftAmount);
        setShowWelcomeModal(true);
      })
      .catch(() => {});
  }, [params.onboarded, accessToken]);

  const onClaimWelcomeGift = () => {
    setShowWelcomeModal(false);
    setCelebrating(true);
  };

  // Alimenta el badge de la campana: solo lo pendiente por aceptar/rechazar
  // (invitaciones a colecciones compartidas + familia de FrikiTokens), no un
  // historial completo de notificaciones (decisión confirmada 2026-10-02).
  const loadPendingCount = useCallback(() => {
    if (!accessToken) return;
    Promise.all([fetchMyCollectionInvites(accessToken), fetchMyInvites(accessToken)])
      .then(([collectionInvites, orgInvites]) => setPendingCount(collectionInvites.length + orgInvites.length))
      .catch(() => {});
  }, [accessToken]);

  useFocusEffect(useCallback(loadPendingCount, [loadPendingCount]));

  const load = useCallback(() => {
    if (!accessToken) return;
    let active = true;
    // Si falla, no se pisa lo último que se cargó con un "0 objetos" falso —
    // se avisa con un error y un botón para reintentar.
    fetchItems(accessToken)
      .then((loadedItems) => {
        if (!active) return;
        setItems(loadedItems);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(authErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useFocusEffect(useCallback(load, [load]));

  const favorites = items?.filter((item) => item.isFavorite) ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
      <View className="flex-row items-center justify-between">
        <LogoHorizontal />

        <Pressable
          onPress={() => router.push('/notificaciones')}
          accessibilityLabel="Notificaciones"
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {pendingCount > 0 ? (
            <View
              className="absolute items-center justify-center rounded-full bg-danger"
              style={{ top: 4, right: 4, minWidth: 16, height: 16, paddingHorizontal: 3 }}
            >
              <Text className="text-[10px] font-body-bold text-white">{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {error && items !== null ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}

      {items === null ? (
        error ? (
          <View className="mt-12 items-center gap-4">
            <Text className="text-center text-sm text-danger">{error}</Text>
            <Button label="Reintentar" onPress={load} />
          </View>
        ) : (
          <ActivityIndicator className="mt-12" color={colors.primary} />
        )
      ) : (
        <>
          <View className="mt-6 flex-row gap-3">
            <StatCard label="Objetos totales" value={items.length} onPress={() => router.push('/(tabs)/objetos')} />
            {balance != null ? <StatCard label="Tus FrikiTokens" value={displayedBalance} icon /> : null}
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

              <Pressable
                onPress={() => router.push('/es-coleccionable')}
                className="mt-4 flex-row items-center rounded-xl bg-primary p-5 active:bg-primaryHover"
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text className="font-display text-xl uppercase tracking-wide text-primaryText">¿Es Coleccionable?</Text>
                    {collectibilityCost != null ? (
                      <View className="flex-row items-center gap-1">
                        <FtCoin size={12} />
                        <Text className="text-sm text-primaryText">
                          {collectibilityCost}
                          <Text style={{ fontSize: 9 }}>FT</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-sm text-primaryText/80">
                    Fotografía cualquier objeto y descubre qué tan coleccionable es y cuánto vale hoy.
                  </Text>
                </View>
                <Ionicons name="sparkles" size={32} color={colors.primaryText} />
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

              <Pressable
                onPress={() => router.push('/es-coleccionable')}
                className="mt-4 flex-row items-center rounded-xl bg-primary p-5 active:bg-primaryHover"
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text className="font-display text-xl uppercase tracking-wide text-primaryText">¿Es Coleccionable?</Text>
                    {collectibilityCost != null ? (
                      <View className="flex-row items-center gap-1">
                        <FtCoin size={12} />
                        <Text className="text-sm text-primaryText">
                          {collectibilityCost}
                          <Text style={{ fontSize: 9 }}>FT</Text>
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-sm text-primaryText/80">
                    Fotografía cualquier objeto y descubre qué tan coleccionable es y cuánto vale hoy.
                  </Text>
                </View>
                <Ionicons name="sparkles" size={32} color={colors.primaryText} />
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
                      <FavoriteCard key={item.id} item={item} onOpen={() => router.push(`/objeto/${item.id}`)} />
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

      <FallingCoinsAnimation visible={celebrating} onDone={() => setCelebrating(false)} />

      <Modal visible={showWelcomeModal} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-[380px] items-center rounded-2xl bg-surface p-6">
            <FtCoin size={48} />
            <Text className="font-display mt-4 text-center text-lg uppercase text-primary">¡Bienvenido!</Text>
            <Text className="mt-2 text-center text-sm text-textSecondary">
              Te regalamos {welcomeGiftAmount} FT para que puedas usar la app con todas sus funciones. Siempre podrás
              adquirir más FrikiTokens en tu perfil.
            </Text>
            <View className="mt-5 w-full">
              <Button label="¡Recibir FrikiTokens!" onPress={onClaimWelcomeGift} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
