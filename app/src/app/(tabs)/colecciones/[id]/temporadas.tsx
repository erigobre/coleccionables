import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  DEFAULT_LOCATION_ICON,
  fetchLocationTree,
  flattenLocationTree,
  type LocationIconKey,
  type LocationNode,
} from '../../../../lib/locations';
import {
  createCollectionSeasonAssignment,
  describeSeasonRecurrence,
  fetchCollectionSeasonAssignments,
  fetchSeasons,
  removeCollectionSeasonAssignment,
  type CollectionSeasonAssignment,
  type Season,
} from '../../../../lib/seasons';
import { colors } from '../../../../theme/tokens';
import { useFocusEffect } from 'expo-router';

type Step = 'list' | 'season' | 'location';

// Asignar una temporada a esta colección: solo liga destino + temporada,
// no mueve nada todavía (el movimiento se hace en el checklist cuando la
// temporada empieza/termina). Separado a propósito de "Reubicar colección".
export default function CollectionSeasonsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [assignments, setAssignments] = useState<CollectionSeasonAssignment[] | null>(null);
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [locations, setLocations] = useState<LocationNode[] | null>(null);
  const [step, setStep] = useState<Step>('list');
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setError(null);
      const [list, allSeasons] = await Promise.all([
        fetchCollectionSeasonAssignments(accessToken, id),
        fetchSeasons(accessToken),
      ]);
      setAssignments(list);
      setSeasons(allSeasons);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const startAssign = () => {
    if (!accessToken) return;
    setError(null);
    fetchLocationTree(accessToken).then(setLocations).catch((err) => setError(authErrorMessage(err)));
    setStep('season');
  };

  const onCreate = async (destinationLocationId: string) => {
    if (!accessToken || !id || !seasonId) return;
    setSaving(true);
    setError(null);
    try {
      await createCollectionSeasonAssignment(accessToken, id, { seasonId, destinationLocationId });
      setStep('list');
      setSeasonId(null);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onRemove = (assignment: CollectionSeasonAssignment) => {
    if (!accessToken || !id) return;
    Alert.alert(
      'Quitar temporada',
      `"${assignment.season.name}" ya no recordará cambiar de ubicación esta colección. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(assignment.id);
            try {
              await removeCollectionSeasonAssignment(accessToken, id, assignment.id);
              await load();
            } catch (err) {
              setError(authErrorMessage(err));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  if (assignments === null || seasons === null) {
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

  const availableSeasons = seasons.filter((season) => !assignments.some((a) => a.seasonId === season.id));

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20 }}>
        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {step === 'list' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">
              Las temporadas asignadas aquí te recordarán cambiar de ubicación esta colección cuando empiecen, y
              regresarla cuando terminen.
            </Text>

            {assignments.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="Sin temporadas asignadas"
                description="Asigna una temporada para activar los recordatorios de cambio de ubicación."
              />
            ) : (
              <View className="mb-6 rounded-lg border border-border bg-surface">
                {assignments.map((assignment, index) => (
                  <View
                    key={assignment.id}
                    className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
                  >
                    <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                    <View className="flex-1">
                      <Text className="text-base text-text">{assignment.season.name}</Text>
                      <Text className="text-xs text-textMuted">{describeSeasonRecurrence(assignment.season)}</Text>
                      <Text className="text-xs text-textMuted">Destino: {assignment.destinationLocation.name}</Text>
                    </View>
                    {removingId === assignment.id ? (
                      <ActivityIndicator color={colors.textMuted} />
                    ) : (
                      <Pressable onPress={() => onRemove(assignment)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}

            <Button
              label="+ Asignar temporada"
              variant="secondary"
              onPress={startAssign}
              disabled={availableSeasons.length === 0}
            />
            {availableSeasons.length === 0 && seasons.length > 0 ? (
              <Text className="mt-2 text-xs text-textMuted">Ya asignaste todas tus temporadas a esta colección.</Text>
            ) : null}
            {seasons.length === 0 ? (
              <Text className="mt-2 text-xs text-textMuted">
                No tienes temporadas creadas todavía. Crea una desde Perfil → Temporadas.
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 'season' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿Qué temporada quieres asignar?</Text>
            <View className="rounded-lg border border-border bg-surface">
              {availableSeasons.map((season, index) => (
                <Pressable
                  key={season.id}
                  onPress={() => {
                    setSeasonId(season.id);
                    setStep('location');
                  }}
                  className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="text-base text-text">{season.name}</Text>
                    <Text className="text-xs text-textMuted">{describeSeasonRecurrence(season)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 'location' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿A dónde se mueve esta colección mientras dure la temporada?</Text>
            {locations === null ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View className="flex-row flex-wrap justify-between gap-3">
                {flattenLocationTree(locations).map(({ node }) => (
                  <Pressable
                    key={node.id}
                    onPress={() => onCreate(node.id)}
                    disabled={saving}
                    style={{ width: '31%' }}
                    className="aspect-square items-center justify-center rounded-2xl border border-border bg-surfaceElevated p-2 active:opacity-80"
                  >
                    <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-surface">
                      <Ionicons name={(node.icon as LocationIconKey | null) ?? DEFAULT_LOCATION_ICON} size={24} color={colors.primary} />
                    </View>
                    <Text className="text-center text-sm text-text" numberOfLines={2}>
                      {node.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {step !== 'list' ? (
        <View className="border-t border-border bg-background px-5 pb-8 pt-3">
          <Button
            label="Atrás"
            variant="ghost"
            onPress={() => setStep(step === 'location' ? 'season' : 'list')}
            disabled={saving}
          />
        </View>
      ) : null}
    </View>
  );
}
