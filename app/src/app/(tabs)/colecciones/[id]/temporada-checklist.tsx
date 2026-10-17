import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import {
  applySeasonChecklist,
  fetchSeasonChecklist,
  type SeasonChecklistDirection,
  type SeasonChecklistGroup,
} from '../../../../lib/seasons';
import { colors } from '../../../../theme/tokens';

// Checklist agrupado por ubicación de origen: al iniciar temporada agrupa por
// dónde está cada objeto hoy (para saber qué cargar); al terminarla agrupa
// igual, ya que todos están en la misma ubicación temporal. Siempre vivo:
// nunca se guarda una lista fija de objetos, se recalcula contra la colección.
export default function SeasonChecklistScreen() {
  const { id, assignmentId, direction } = useLocalSearchParams<{
    id: string;
    assignmentId: string;
    direction: SeasonChecklistDirection;
  }>();
  const { accessToken } = useAuth();

  const [groups, setGroups] = useState<SeasonChecklistGroup[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | 'all' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id || !assignmentId || !direction) return;
    try {
      setError(null);
      setGroups(await fetchSeasonChecklist(accessToken, id, assignmentId, direction));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id, assignmentId, direction]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalPending = (groups ?? []).reduce(
    (sum, g) => sum + g.items.filter((item) => !done.has(item.id)).length,
    0,
  );

  const applyIds = async (itemIds: string[], busyKey: string) => {
    if (!accessToken || !id || !assignmentId || !direction || itemIds.length === 0) return;
    setBulkBusy(busyKey);
    setError(null);
    try {
      await applySeasonChecklist(accessToken, id, assignmentId, direction, itemIds);
      setDone((prev) => {
        const next = new Set(prev);
        itemIds.forEach((itemId) => next.add(itemId));
        return next;
      });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBulkBusy(null);
    }
  };

  const onMarkAllGroup = (group: SeasonChecklistGroup) => {
    const pendingIds = group.items.filter((item) => !done.has(item.id)).map((item) => item.id);
    applyIds(pendingIds, group.locationId ?? 'none');
  };

  const onMarkAll = () => {
    const pendingIds = (groups ?? []).flatMap((g) => g.items.filter((item) => !done.has(item.id)).map((item) => item.id));
    if (pendingIds.length === 0) return;
    Alert.alert(
      'Marcar todos',
      direction === 'start'
        ? `¿Mover ${pendingIds.length === 1 ? '1 objeto' : `${pendingIds.length} objetos`} a su ubicación de temporada?`
        : `¿Regresar ${pendingIds.length === 1 ? '1 objeto' : `${pendingIds.length} objetos`} a su ubicación principal?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí', onPress: () => applyIds(pendingIds, 'all') },
      ],
    );
  };

  const title = direction === 'start' ? 'Mover a temporada' : 'Regresar de temporada';
  // No depende de `groups`: se monta desde el primer render para que el
  // header nunca pase de un título a otro ya con la pantalla visible (esa
  // transición nativa hacía parpadear el header, incluido el botón "Atrás",
  // bug reportado 2026-10-17).
  const headerTitle = <Stack.Screen options={{ title }} />;

  if (groups === null) {
    if (error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
          {headerTitle}
          <Text className="text-center text-sm text-danger">{error}</Text>
          <Button label="Reintentar" onPress={load} />
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {headerTitle}
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, paddingHorizontal: 20 }}
    >
      {headerTitle}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {groups.every((g) => g.items.length === 0) ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Todo listo"
          description={
            direction === 'start'
              ? 'Ya moviste todos los objetos a su ubicación de temporada.'
              : 'Ya regresaste todos los objetos a su ubicación principal.'
          }
        />
      ) : (
        <>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm text-textMuted">
              {totalPending === 0 ? 'Todo listo' : `Pendientes: ${totalPending}`}
            </Text>
            <Pressable
              onPress={onMarkAll}
              disabled={totalPending === 0 || bulkBusy !== null}
              hitSlop={8}
              className={totalPending === 0 ? 'opacity-40' : 'active:opacity-70'}
            >
              {bulkBusy === 'all' ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                <Text className="text-sm text-textMuted underline">Marcar todos</Text>
              )}
            </Pressable>
          </View>

          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => {
              const groupKey = group.locationId ?? 'none';
              const pendingInGroup = group.items.filter((item) => !done.has(item.id));
              return (
                <View key={groupKey} className="mb-5">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="font-body-bold text-sm text-text">{group.locationName}</Text>
                    <Pressable
                      onPress={() => onMarkAllGroup(group)}
                      disabled={pendingInGroup.length === 0 || bulkBusy !== null}
                      hitSlop={8}
                      className={pendingInGroup.length === 0 ? 'opacity-40' : 'active:opacity-70'}
                    >
                      {bulkBusy === groupKey ? (
                        <ActivityIndicator size="small" color={colors.textMuted} />
                      ) : (
                        <Text className="text-xs text-textMuted underline">Marcar grupo</Text>
                      )}
                    </Pressable>
                  </View>

                  <View className="rounded-lg border border-border bg-surface">
                    {group.items.map((item, index) => {
                      const isDone = done.has(item.id);
                      const busy = bulkBusy !== null;
                      const photo = item.photoUrl ? resolvePhotoUrl(item.photoUrl) : undefined;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => applyIds([item.id], item.id)}
                          disabled={isDone || busy}
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
                          <Text className="flex-1 font-body-bold text-sm text-text" numberOfLines={1}>
                            {item.name}
                          </Text>
                          {bulkBusy === item.id ? (
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
                </View>
              );
            })}
        </>
      )}
    </ScrollView>
  );
}
