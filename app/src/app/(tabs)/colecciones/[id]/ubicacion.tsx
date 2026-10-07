import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { moveCollectionLocation } from '../../../../lib/collections';
import {
  DEFAULT_LOCATION_ICON,
  fetchLocationTree,
  flattenLocationTree,
  type LocationIconKey,
  type LocationNode,
} from '../../../../lib/locations';
import { fetchSeasons, type Season } from '../../../../lib/seasons';
import { colors } from '../../../../theme/tokens';

type Step = 'destination' | 'assignment' | 'season';

// Mosaico cuadrado (1:1), mismo formato que el de un objeto. Muestra el icono de
// la ubicación; si no hay icono (temporadas o "No aplica"), muestra la inicial.
function SquareTile({
  name,
  icon,
  onPress,
  disabled,
}: {
  name: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ width: '31%' }}
      className="aspect-square items-center justify-center rounded-2xl border border-border bg-surfaceElevated p-2 active:opacity-80"
    >
      <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-surface">
        {icon ? (
          <Ionicons name={icon} size={24} color={colors.primary} />
        ) : (
          <Text className="font-display text-lg text-primary">{initial}</Text>
        )}
      </View>
      <Text className="text-center text-sm text-text" numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

// Reubicar una colección completa: mismo flujo que el de un objeto (destino →
// Principal/temporal → temporada), aplicado a todos sus objetos.
export default function MoveCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [locations, setLocations] = useState<LocationNode[] | null>(null);
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  const [step, setStep] = useState<Step>('destination');
  const [locationId, setLocationId] = useState<string | null>(null);
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

  const finish = async (assignment: 'INDEFINIDO' | 'TEMPORAL', seasonId?: string) => {
    if (!accessToken || !id || !locationId) return;
    setSaving(true);
    setError(null);
    try {
      const { updated, skippedInTransfer } = await moveCollectionLocation(accessToken, id, {
        locationId,
        assignment,
        seasonId,
      });
      const destination = flattenLocationTree(locations ?? []).find(({ node }) => node.id === locationId)?.node.name;
      const moved = updated === 1 ? '1 objeto' : `${updated} objetos`;
      const skipped =
        skippedInTransfer > 0
          ? `\n\n${skippedInTransfer === 1 ? '1 objeto' : `${skippedInTransfer} objetos`} en transferencia no se movieron.`
          : '';
      Alert.alert('Colección reubicada', `Se movieron ${moved}${destination ? ` a "${destination}"` : ''}.${skipped}`, [
        { text: 'Listo', onPress: () => router.back() },
      ]);
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
  let footer: ReactNode = null;
  if (step === 'assignment') {
    footer = <Button label="Atrás" variant="ghost" onPress={() => setStep('destination')} disabled={saving} />;
  } else if (step === 'season') {
    footer = <Button label="Atrás" variant="ghost" onPress={() => setStep('assignment')} disabled={saving} />;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20 }}>
        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {step === 'destination' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿A dónde quieres mover todos los objetos de esta colección?</Text>
            {locations.length === 0 ? (
              <Text className="text-sm text-textMuted">
                No tienes ubicaciones creadas todavía. Crea una desde Perfil → Ubicaciones.
              </Text>
            ) : (
              <View className="flex-row flex-wrap justify-between gap-3">
                {flattenLocationTree(locations).map(({ node }) => (
                  <SquareTile
                    key={node.id}
                    name={node.name}
                    icon={(node.icon as LocationIconKey | null) ?? DEFAULT_LOCATION_ICON}
                    onPress={() => {
                      setLocationId(node.id);
                      setStep('assignment');
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {step === 'assignment' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿Lo dejas como ubicación principal o solo temporal (por temporada)?</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Principal" onPress={() => finish('INDEFINIDO')} loading={saving} />
              </View>
              <View className="flex-1">
                <Button label="Temporal" variant="secondary" onPress={() => setStep('season')} disabled={saving} />
              </View>
            </View>
          </View>
        ) : null}

        {step === 'season' ? (
          <View>
            <Text className="mb-4 text-sm text-textMuted">¿A qué temporada se liga este cambio?</Text>
            <View className="flex-row flex-wrap justify-between gap-3">
              {/* "No aplica" va siempre primero: mueve en temporal sin ligarlo a una temporada. */}
              <SquareTile
                name="No aplica"
                icon="close-circle-outline"
                disabled={saving}
                onPress={() => finish('TEMPORAL')}
              />
              {seasons.map((season) => (
                <SquareTile
                  key={season.id}
                  name={season.name}
                  disabled={saving}
                  onPress={() => finish('TEMPORAL', season.id)}
                />
              ))}
            </View>
            {seasons.length === 0 ? (
              <Text className="mt-4 text-sm text-textMuted">
                No tienes temporadas creadas todavía. Crea una desde Perfil → Temporadas.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {footer ? <View className="border-t border-border bg-background px-5 pb-8 pt-3">{footer}</View> : null}
    </View>
  );
}
