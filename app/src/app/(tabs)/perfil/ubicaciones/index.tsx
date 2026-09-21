import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { createLocation, fetchLocationTree, type LocationNode } from '../../../../lib/locations';

function LocationRow({
  node,
  depth,
  onPress,
}: {
  node: LocationNode;
  depth: number;
  onPress: (id: string) => void;
}) {
  return (
    <View>
      <Pressable
        onPress={() => onPress(node.id)}
        className="flex-row items-center gap-3 border-b border-border py-3"
        style={{ paddingLeft: 16 + depth * 20 }}
      >
        <Ionicons name={depth === 0 ? 'location-outline' : 'return-down-forward-outline'} size={18} color={colors.textMuted} />
        <Text className="flex-1 text-base text-text">{node.name}</Text>
        {node.isPermanentDefault ? (
          <Text className="text-xs text-textMuted">Permanente</Text>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
      {node.children.map((child) => (
        <LocationRow key={child.id} node={child} depth={depth + 1} onPress={onPress} />
      ))}
    </View>
  );
}

export default function UbicacionesScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [tree, setTree] = useState<LocationNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setTree(await fetchLocationTree(accessToken));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onCreate = async () => {
    if (!accessToken || name.trim().length === 0) return;
    setError(null);
    setSaving(true);
    try {
      await createLocation(accessToken, { name: name.trim() });
      setName('');
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (tree === null) {
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
        Organiza tu colección en ubicaciones y sub-ubicaciones (ej. Bodega 1 → Estante B → Caja 7).
      </Text>

      {tree.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="Aún no tienes ubicaciones"
          description="Crea tu primera ubicación para empezar a organizar dónde guardas tus objetos."
        />
      ) : (
        <View className="mb-6 rounded-lg border border-border bg-surface">
          {tree.map((node) => (
            <LocationRow key={node.id} node={node} depth={0} onPress={(id) => router.push(`/(tabs)/perfil/ubicaciones/${id}`)} />
          ))}
        </View>
      )}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {showCreate ? (
        <View className="rounded-lg border border-border bg-surface p-4">
          <TextField
            label="Nombre de la ubicación"
            value={name}
            onChangeText={setName}
            placeholder="Ej. Bodega 1"
            autoFocus
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={() => {
                  setShowCreate(false);
                  setName('');
                }}
              />
            </View>
            <View className="flex-1">
              <Button label="Crear" onPress={onCreate} loading={saving} disabled={name.trim().length === 0} />
            </View>
          </View>
        </View>
      ) : (
        <Button label="+ Nueva ubicación" onPress={() => setShowCreate(true)} />
      )}
    </ScrollView>
  );
}
