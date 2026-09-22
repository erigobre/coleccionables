import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { flattenLocationTree, fetchLocationTree, type LocationNode } from '../../../../lib/locations';
import { fetchSeasons, type Season } from '../../../../lib/seasons';
import { changeItemLocation, type LocationChangeAssignment } from '../../../../lib/items';
import { colors } from '../../../../theme/tokens';

type Step = 'destination' | 'assignment' | 'season';

export default function ChangeLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [locations, setLocations] = useState<LocationNode[] | null>(null);
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [step, setStep] = useState<Step>('destination');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<LocationChangeAssignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(() => {
    if (!accessToken) return;
    setError(null);
    fetchLocationTree(accessToken).then(setLocations).catch((err) => setError(authErrorMessage(err)));
    fetchSeasons(accessToken).then(setSeasons).catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const finish = async (dto: Parameters<typeof changeItemLocation>[2]) => {
    if (!accessToken || !id) return;
    setSaving(true);
    setError(null);
    try {
      await changeItemLocation(accessToken, id, dto);
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
      setSaving(false);
    }
  };

  if (locations === null || seasons === null) {
    if (error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
          <Text className="text-center text-sm text-danger">{error}</Text>
          <Button label="Reintentar" onPress={loadOptions} />
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
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 60, paddingHorizontal: 20 }}
    >
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {step === 'destination' ? (
        <View>
          <Text className="mb-4 text-sm text-textMuted">¿A dónde quieres mover este objeto?</Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {flattenLocationTree(locations).map(({ node, depth }) => (
              <Pressable
                key={node.id}
                onPress={() => {
                  setLocationId(node.id);
                  setStep('assignment');
                }}
                className="rounded-full border border-border bg-surfaceElevated px-3 py-2"
              >
                <Text className="text-sm text-textMuted">
                  {'— '.repeat(depth)}
                  {node.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Donado" variant="secondary" onPress={() => finish({ destination: 'DONATED' })} loading={saving} />
            </View>
            <View className="flex-1">
              <Button label="Perdido" variant="destructive" onPress={() => finish({ destination: 'LOST' })} loading={saving} />
            </View>
          </View>
        </View>
      ) : null}

      {step === 'assignment' ? (
        <View>
          <Text className="mb-4 text-sm text-textMuted">¿El cambio es indefinido o solo temporal (por temporada)?</Text>
          <View className="mb-6 flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Indefinido"
                onPress={() => {
                  if (!locationId) return;
                  finish({ destination: 'LOCATION', locationId, assignment: 'INDEFINIDO' });
                }}
                loading={saving}
              />
            </View>
            <View className="flex-1">
              <Button
                label="Temporal"
                variant="secondary"
                onPress={() => {
                  setAssignment('TEMPORAL');
                  setStep('season');
                }}
              />
            </View>
          </View>
          <Button label="Atrás" variant="ghost" onPress={() => setStep('destination')} />
        </View>
      ) : null}

      {step === 'season' ? (
        <View>
          <Text className="mb-4 text-sm text-textMuted">¿A qué temporada se liga este cambio?</Text>
          {seasons.length === 0 ? (
            <Text className="mb-6 text-sm text-textMuted">
              No tienes temporadas creadas todavía. Crea una desde Perfil → Temporadas.
            </Text>
          ) : (
            <View className="mb-6 flex-row flex-wrap gap-2">
              {seasons.map((season) => (
                <Pressable
                  key={season.id}
                  onPress={() => {
                    if (!locationId || !assignment) return;
                    finish({ destination: 'LOCATION', locationId, assignment, seasonId: season.id });
                  }}
                  className="rounded-full border border-border bg-surfaceElevated px-3 py-2"
                >
                  <Text className="text-sm text-textMuted">{season.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Button label="Atrás" variant="ghost" onPress={() => setStep('assignment')} />
        </View>
      ) : null}
    </ScrollView>
  );
}
