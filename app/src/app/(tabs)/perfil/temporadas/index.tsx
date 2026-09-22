import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { DatePickerField, toIsoDate } from '../../../../components/ui/DatePickerField';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { createSeason, fetchSeasons, type Season } from '../../../../lib/seasons';

function formatRange(startDate: string, endDate: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

export default function TemporadasScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setSeasons(await fetchSeasons(accessToken));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resetForm = () => {
    setShowCreate(false);
    setName('');
    setStartDate(null);
    setEndDate(null);
  };

  const canSubmit = name.trim().length > 0 && startDate !== null && endDate !== null;

  const onCreate = async () => {
    if (!accessToken || !startDate || !endDate || name.trim().length === 0) return;
    setError(null);
    setSaving(true);
    try {
      await createSeason(accessToken, {
        name: name.trim(),
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
      });
      resetForm();
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (seasons === null) {
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
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, paddingHorizontal: 20 }}
    >
      <Text className="mb-4 text-sm text-textMuted">
        Crea temporadas (Halloween, Navidad, Pascua...) para llevar el control de qué objetos moviste
        temporalmente y recordar regresarlos a su ubicación principal.
      </Text>

      {seasons.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Aún no tienes temporadas"
          description="Crea una temporada para agrupar los cambios de ubicación temporales."
        />
      ) : (
        <View className="mb-6 rounded-lg border border-border bg-surface">
          {seasons.map((season) => (
            <Pressable
              key={season.id}
              onPress={() => router.push(`/(tabs)/perfil/temporadas/${season.id}`)}
              className="flex-row items-center gap-3 border-b border-border px-4 py-3"
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <View className="flex-1">
                <Text className="text-base text-text">{season.name}</Text>
                <Text className="text-xs text-textMuted">{formatRange(season.startDate, season.endDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {showCreate ? (
        <View className="rounded-lg border border-border bg-surface p-4">
          <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Halloween" autoFocus />
          <DatePickerField label="Fecha de inicio" value={startDate} onChange={setStartDate} />
          <DatePickerField label="Fecha de fin" value={endDate} onChange={setEndDate} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={resetForm} />
            </View>
            <View className="flex-1">
              <Button label="Crear" onPress={onCreate} loading={saving} disabled={!canSubmit} />
            </View>
          </View>
        </View>
      ) : (
        <Button label="+ Nueva temporada" onPress={() => setShowCreate(true)} />
      )}
    </ScrollView>
  );
}
