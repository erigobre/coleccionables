import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import { returnCollectionToPermanentLocation } from '../../../../lib/collections';
import { fetchItems, isAwayFromPermanent, type Item } from '../../../../lib/items';
import { returnItemToPermanentLocation } from '../../../../lib/seasons';
import { colors } from '../../../../theme/tokens';

// Checklist de regreso a la ubicación permanente: cada checkbox regresa un objeto;
// "Marcar todos" los regresa en bloque (con confirmación).
export default function ReturnCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();

  const [items, setItems] = useState<Item[] | null>(null);
  // Objetos ya regresados en esta pantalla: se quedan en la lista, marcados.
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setError(null);
      const list = await fetchItems(accessToken, { collectionId: id });
      setItems(list.filter(isAwayFromPermanent));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = (items ?? []).filter((item) => !done.has(item.id));

  const onReturnOne = async (item: Item) => {
    if (!accessToken || busyId || bulkBusy) return;
    setBusyId(item.id);
    setError(null);
    try {
      await returnItemToPermanentLocation(accessToken, item.id);
      setDone((prev) => new Set(prev).add(item.id));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const onReturnAll = () => {
    if (!accessToken || !id || pending.length === 0) return;
    const count = pending.length;
    Alert.alert(
      'Regresar objetos',
      `¿Deseas regresar ${count === 1 ? '1 objeto' : `${count} objetos`} a su ubicación principal?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí',
          onPress: async () => {
            setBulkBusy(true);
            setError(null);
            try {
              await returnCollectionToPermanentLocation(accessToken, id);
              setDone(new Set((items ?? []).map((item) => item.id)));
            } catch (err) {
              setError(authErrorMessage(err));
            } finally {
              setBulkBusy(false);
            }
          },
        },
      ],
    );
  };

  if (items === null) {
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

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, paddingHorizontal: 20 }}
    >
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {items.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Todo está en su lugar"
          description="Ningún objeto de esta colección está fuera de su ubicación permanente."
        />
      ) : (
        <>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-textMuted">
              {pending.length === 0 ? 'Todos regresaron a su lugar' : `Pendientes: ${pending.length} de ${items.length}`}
            </Text>
            <Pressable
              onPress={onReturnAll}
              disabled={pending.length === 0 || bulkBusy}
              hitSlop={8}
              className={pending.length === 0 ? 'opacity-40' : 'active:opacity-70'}
            >
              {bulkBusy ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Text className="text-sm text-textMuted underline">Marcar todos</Text>
              )}
            </Pressable>
          </View>

          <View className="rounded-lg border border-border bg-surface">
            {items.map((item, index) => {
              const isDone = done.has(item.id);
              const busy = busyId === item.id;
              const photo = item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onReturnOne(item)}
                  disabled={isDone || busy || bulkBusy}
                  className={`flex-row items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
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
                  <View className="flex-1">
                    <Text className="font-body-bold text-sm text-text" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-textMuted" numberOfLines={1}>
                      Actual: {isDone ? (item.permanentLocation?.name ?? '—') : (item.currentLocation?.name ?? 'Sin ubicación')}
                    </Text>
                    <Text className="text-xs text-textMuted" numberOfLines={1}>
                      Principal: {item.permanentLocation?.name ?? '—'}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons
                      name={isDone ? 'checkbox' : 'square-outline'}
                      size={26}
                      color={isDone ? colors.primary : colors.textMuted}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
