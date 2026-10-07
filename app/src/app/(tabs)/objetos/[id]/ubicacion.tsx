import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { flattenLocationTree, fetchLocationTree, type LocationNode } from '../../../../lib/locations';
import { fetchSeasons, type Season } from '../../../../lib/seasons';
import { changeItemLocation, type LocationChangeAssignment } from '../../../../lib/items';
import { colors } from '../../../../theme/tokens';

type Step = 'destination' | 'assignment' | 'season';

// Mosaico cuadrado (1:1) para ubicaciones y temporadas. Por ahora muestra la
// inicial dentro de un círculo; el icono configurable se agregará después.
function SquareTile({ name, onPress }: { name: string; onPress: () => void }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <Pressable
      onPress={onPress}
      style={{ width: '31%' }}
      className="aspect-square items-center justify-center rounded-2xl border border-border bg-surfaceElevated p-2 active:opacity-80"
    >
      <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-surface">
        <Text className="font-display text-lg text-primary">{initial}</Text>
      </View>
      <Text className="text-center text-sm text-text" numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

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

  // Pie fijo: queda pegado abajo aunque la lista de ubicaciones o temporadas sea larga.
  let footer: ReactNode;
  if (step === 'destination') {
    footer = (
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button label="Donado" variant="secondary" onPress={() => finish({ destination: 'DONATED' })} loading={saving} />
        </View>
        <View className="flex-1">
          <Button label="Perdido" variant="destructive" onPress={() => finish({ destination: 'LOST' })} loading={saving} />
        </View>
      </View>
    );
  } else {
    footer = (
      <Button
        label="Atrás"
        variant="ghost"
        onPress={() => setStep(step === 'season' ? 'assignment' : 'destination')}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20 }}>
        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {step === 'destination' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿A dónde quieres mover este objeto?</Text>
            <View className="flex-row flex-wrap justify-between gap-3">
              {flattenLocationTree(locations).map(({ node }) => (
                <SquareTile
                  key={node.id}
                  name={node.name}
                  onPress={() => {
                    setLocationId(node.id);
                    setStep('assignment');
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 'assignment' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿Lo dejas como ubicación principal o solo temporal (por temporada)?</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Principal"
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
          </View>
        ) : null}

        {step === 'season' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿A qué temporada se liga este cambio?</Text>
            {seasons.length === 0 ? (
              <Text className="text-sm text-textMuted">
                No tienes temporadas creadas todavía. Crea una desde Perfil → Temporadas.
              </Text>
            ) : (
              <View className="flex-row flex-wrap justify-between gap-3">
                {seasons.map((season) => (
                  <SquareTile
                    key={season.id}
                    name={season.name}
                    onPress={() => {
                      if (!locationId || !assignment) return;
                      finish({ destination: 'LOCATION', locationId, assignment, seasonId: season.id });
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View className="border-t border-border bg-background px-5 pb-8 pt-3">{footer}</View>
    </View>
  );
}
