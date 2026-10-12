import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { ChipSelect } from '../../../../components/ui/ChipSelect';
import { DatePickerField } from '../../../../components/ui/DatePickerField';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  anchorsFromDates,
  datesFromSeason,
  deleteSeason,
  describeSeasonRecurrence,
  fetchSeason,
  updateSeason,
  type Season,
  type SeasonRecurrence,
} from '../../../../lib/seasons';

const REMINDER_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} día${i === 0 ? '' : 's'}` }));

export default function SeasonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [season, setSeason] = useState<Season | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [recurrence, setRecurrence] = useState<SeasonRecurrence>('YEARLY');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startWeekday, setStartWeekday] = useState<string | null>(null);
  const [endWeekday, setEndWeekday] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState<string | null>('5');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fillForm = (found: Season) => {
    setName(found.name);
    setRecurrence(found.recurrence);
    setReminderEnabled(found.reminderDaysBefore != null);
    setReminderDays(found.reminderDaysBefore != null ? String(found.reminderDaysBefore) : '5');
    if (found.recurrence === 'WEEKLY') {
      setStartWeekday(found.startWeekday != null ? String(found.startWeekday) : null);
      setEndWeekday(found.endWeekday != null ? String(found.endWeekday) : null);
      setStartDate(null);
      setEndDate(null);
    } else {
      const dates = datesFromSeason(found);
      setStartDate(dates?.start ?? null);
      setEndDate(dates?.end ?? null);
      setStartWeekday(null);
      setEndWeekday(null);
    }
  };

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const found = await fetchSeason(accessToken, id).catch(() => null);
      setSeason(found);
      if (found) fillForm(found);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const anchorsComplete =
    recurrence === 'WEEKLY' ? startWeekday !== null && endWeekday !== null : startDate !== null && endDate !== null;
  const canSubmit = name.trim().length > 0 && anchorsComplete;

  const onSave = async () => {
    if (!accessToken || !season || !canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      const anchors =
        recurrence === 'WEEKLY'
          ? { startWeekday: Number(startWeekday), endWeekday: Number(endWeekday) }
          : anchorsFromDates(recurrence, startDate!, endDate!);
      await updateSeason(accessToken, season.id, {
        name: name.trim(),
        recurrence,
        ...anchors,
        reminderDaysBefore: reminderEnabled && reminderDays ? Number(reminderDays) : null,
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

  if (season === undefined) {
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

          <ChipSelect
            label="¿Con qué frecuencia se repite?"
            options={RECURRENCE_OPTIONS}
            value={recurrence}
            onChange={(value) => {
              setRecurrence(value);
              setStartDate(null);
              setEndDate(null);
              setStartWeekday(null);
              setEndWeekday(null);
            }}
          />

          {recurrence === 'WEEKLY' ? (
            <>
              <ChipSelect label="Día en que empieza" options={WEEKDAY_OPTIONS} value={startWeekday} onChange={setStartWeekday} />
              <ChipSelect label="Día en que termina" options={WEEKDAY_OPTIONS} value={endWeekday} onChange={setEndWeekday} />
            </>
          ) : (
            <>
              <DatePickerField
                label={recurrence === 'ONE_TIME' ? 'Fecha de inicio' : 'Día en que empieza'}
                value={startDate}
                onChange={setStartDate}
              />
              <DatePickerField
                label={recurrence === 'ONE_TIME' ? 'Fecha de fin' : 'Día en que termina'}
                value={endDate}
                onChange={setEndDate}
              />
            </>
          )}

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-textSecondary">¿Avisarme antes del cambio?</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          {reminderEnabled ? (
            <ChipSelect label="¿Cuántos días antes?" options={REMINDER_OPTIONS} value={reminderDays} onChange={setReminderDays} />
          ) : null}

          <View className="mt-2 flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
            </View>
            <View className="flex-1">
              <Button label="Guardar" onPress={onSave} loading={saving} disabled={!canSubmit} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setEditing(true)} className="mb-2 flex-row items-center gap-2">
          <Text className="font-display text-[22px] uppercase tracking-wide text-text">{season.name}</Text>
          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
        </Pressable>
      )}

      {!editing ? <Text className="mb-6 text-sm text-textMuted">{describeSeasonRecurrence(season)}</Text> : null}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {!editing ? (
        <Text className="mb-6 text-sm text-textMuted">
          Para activar esta temporada en una colección (que recuerde cambiarla de ubicación y regresarla), hazlo
          desde la pantalla de esa colección.
        </Text>
      ) : null}

      <Button label="Eliminar temporada" variant="destructive" onPress={onDelete} loading={deleting} />
    </ScrollView>
  );
}
