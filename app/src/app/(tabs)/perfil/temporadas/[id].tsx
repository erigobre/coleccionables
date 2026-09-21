import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { DatePickerField, toIsoDate } from '../../../../components/ui/DatePickerField';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  deleteSeason,
  fetchSeason,
  fetchSeasonItems,
  returnItemToPermanentLocation,
  updateSeason,
  type Season,
  type SeasonItem,
} from '../../../../lib/seasons';

export default function SeasonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const [items, setItems] = useState<SeasonItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [found, seasonItems] = await Promise.all([
        fetchSeason(accessToken, id).catch(() => null),
        fetchSeasonItems(accessToken, id),
      ]);
      setSeason(found);
      setItems(seasonItems);
      if (found) {
        setName(found.name);
        setStartDate(new Date(found.startDate));
        setEndDate(new Date(found.endDate));
      }
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const canSubmit = name.trim().length > 0 && startDate !== null && endDate !== null;

  const onSave = async () => {
    if (!accessToken || !season || !startDate || !endDate) return;
    setError(null);
    setSaving(true);
    try {
      await updateSeason(accessToken, season.id, {
        name: name.trim(),
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
      });
      setEditing(false);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!accessToken || !season) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteSeason(accessToken, season.id);
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const onReturn = async (itemId: string) => {
    if (!accessToken) return;
    setError(null);
    setReturningId(itemId);
    try {
      await returnItemToPermanentLocation(accessToken, itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setReturningId(null);
    }
  };

  if (season === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (season === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-base text-textMuted">Esta temporada ya no existe.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, paddingHorizontal: 20 }}
    >
      {editing ? (
        <View className="mb-6 rounded-lg border border-border bg-surface p-4">
          <TextField label="Nombre" value={name} onChangeText={setName} autoFocus />
          <DatePickerField label="Fecha de inicio" value={startDate} onChange={setStartDate} />
          <DatePickerField label="Fecha de fin" value={endDate} onChange={setEndDate} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
            </View>
            <View className="flex-1">
              <Button label="Guardar" onPress={onSave} loading={saving} disabled={!canSubmit} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)} className="mb-6 flex-row items-center gap-2">
          <Text className="font-display text-[22px] uppercase tracking-wide text-text">{season.name}</Text>
          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
        </Pressable>
      )}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-6">
        <Text className="mb-3 text-sm font-semibold text-text">
          Objetos asignados a esta temporada ({items.length})
        </Text>
        {items.length === 0 ? (
          <Text className="mb-3 text-sm text-textMuted">
            No hay objetos ligados a esta temporada por ahora.
          </Text>
        ) : (
          <View className="rounded-lg border border-border bg-surface">
            {items.map((item) => (
              <View key={item.id} className="border-b border-border px-4 py-3">
                <Text className="text-base text-text">{item.name}</Text>
                <Text className="mb-2 text-xs text-textMuted">
                  Permanente: {item.permanentLocation?.name ?? 'Sin ubicación'} · Actual:{' '}
                  {item.currentLocation?.name ?? 'Sin ubicación'}
                </Text>
                <Button
                  label="Ya lo regresé a su ubicación principal"
                  variant="secondary"
                  onPress={() => onReturn(item.id)}
                  loading={returningId === item.id}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      <Button label="Eliminar temporada" variant="destructive" onPress={onDelete} loading={deleting} />
    </ScrollView>
  );
}
