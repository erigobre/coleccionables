import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { ChipSelect } from '../../../../components/ui/ChipSelect';
import { DatePickerField } from '../../../../components/ui/DatePickerField';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  RECURRENCE_OPTIONS,
  WEEKDAY_OPTIONS,
  anchorsFromDates,
  createSeason,
  describeSeasonRecurrence,
  fetchSeasons,
  type Season,
  type SeasonRecurrence,
} from '../../../../lib/seasons';

const REMINDER_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} día${i === 0 ? '' : 's'}` }));

export default function TemporadasScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [recurrence, setRecurrence] = useState<SeasonRecurrence>('YEARLY');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startWeekday, setStartWeekday] = useState<string | null>(null);
  const [endWeekday, setEndWeekday] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState<string | null>('5');
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
    setRecurrence('YEARLY');
    setStartDate(null);
    setEndDate(null);
    setStartWeekday(null);
    setEndWeekday(null);
    setReminderEnabled(true);
    setReminderDays('5');
  };

  const anchorsComplete =
    recurrence === 'WEEKLY' ? startWeekday !== null && endWeekday !== null : startDate !== null && endDate !== null;
  const canSubmit = name.trim().length > 0 && anchorsComplete;

  const onCreate = async () => {
    if (!accessToken || !canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      const anchors =
        recurrence === 'WEEKLY'
          ? { startWeekday: Number(startWeekday), endWeekday: Number(endWeekday) }
          : anchorsFromDates(recurrence, startDate!, endDate!);
      await createSeason(accessToken, {
        name: name.trim(),
        recurrence,
        ...anchors,
        reminderDaysBefore: reminderEnabled && reminderDays ? Number(reminderDays) : null,
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
        Crea temporadas (Halloween, Navidad, Pascua...) para que recuerden cuándo cambiar de ubicación tus
        colecciones y cuándo regresarlas a su lugar.
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
                <Text className="text-xs text-textMuted">{describeSeasonRecurrence(season)}</Text>
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

          <ChipSelect
            label="¿Con qué frecuencia se repite?"
            options={RECURRENCE_OPTIONS}
            value={recurrence}
            onChange={setRecurrence}
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
              {recurrence !== 'ONE_TIME' ? (
                <Text className="-mt-2 mb-4 text-xs text-textMuted">
                  Solo se guarda el día{recurrence === 'YEARLY' ? ' y el mes' : ''}, nunca el año — se repite sola cada
                  {recurrence === 'YEARLY' ? ' año' : ' mes'}.
                </Text>
              ) : null}
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
