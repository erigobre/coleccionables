import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  createLocation,
  deleteLocation,
  fetchLocationQr,
  fetchLocationTree,
  updateLocation,
  type LocationNode,
} from '../../../../lib/locations';

function findNode(nodes: LocationNode[], id: string): LocationNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [node, setNode] = useState<LocationNode | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [savingChild, setSavingChild] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const tree = await fetchLocationTree(accessToken);
      const found = findNode(tree, id);
      setNode(found ?? null);
      if (found) setName(found.name);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSaveName = async () => {
    if (!accessToken || !node || name.trim().length === 0) return;
    setError(null);
    setSavingName(true);
    try {
      await updateLocation(accessToken, node.id, { name: name.trim() });
      setRenaming(false);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const onAddChild = async () => {
    if (!accessToken || !node || childName.trim().length === 0) return;
    setError(null);
    setSavingChild(true);
    try {
      await createLocation(accessToken, { name: childName.trim(), parentId: node.id });
      setChildName('');
      setShowAddChild(false);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSavingChild(false);
    }
  };

  const onDelete = async () => {
    if (!accessToken || !node) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteLocation(accessToken, node.id);
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const onShowQr = async () => {
    if (!accessToken || !node) return;
    setError(null);
    setLoadingQr(true);
    try {
      const { qrImageDataUrl } = await fetchLocationQr(accessToken, node.id);
      setQrImage(qrImageDataUrl);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoadingQr(false);
    }
  };

  if (node === undefined) {
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

  if (node === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-base text-textMuted">Esta ubicación ya no existe.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, paddingHorizontal: 20 }}
    >
      {renaming ? (
        <View className="mb-6">
          <TextField label="Nombre" value={name} onChangeText={setName} autoFocus />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={() => {
                  setRenaming(false);
                  setName(node.name);
                }}
              />
            </View>
            <View className="flex-1">
              <Button label="Guardar" onPress={onSaveName} loading={savingName} disabled={name.trim().length === 0} />
            </View>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setRenaming(true)} className="mb-6 flex-row items-center gap-2">
          <Text className="font-display text-[22px] uppercase tracking-wide text-text">{node.name}</Text>
          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
        </Pressable>
      )}

      {node.isPermanentDefault ? (
        <Text className="mb-4 text-sm text-textMuted">Esta es tu ubicación permanente por default.</Text>
      ) : null}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-6 rounded-lg border border-border bg-surface p-4">
        <Text className="mb-3 text-sm font-semibold text-text">Código QR</Text>
        <Text className="mb-3 text-xs text-textMuted">
          Genera un código para imprimir y pegar físicamente en esta ubicación.
        </Text>
        {qrImage ? (
          <View className="items-center rounded-md bg-white p-3">
            <Image source={{ uri: qrImage }} style={{ width: 180, height: 180 }} resizeMode="contain" />
          </View>
        ) : (
          <Button label="Generar código QR" variant="secondary" onPress={onShowQr} loading={loadingQr} />
        )}
      </View>

      <View className="mb-6">
        <Text className="mb-3 text-sm font-semibold text-text">Sub-ubicaciones</Text>
        {node.children.length === 0 ? (
          <Text className="mb-3 text-sm text-textMuted">Sin sub-ubicaciones todavía.</Text>
        ) : (
          <View className="mb-3 rounded-lg border border-border bg-surface">
            {node.children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => router.push(`/(tabs)/perfil/ubicaciones/${child.id}`)}
                className="flex-row items-center gap-3 border-b border-border px-4 py-3"
              >
                <Ionicons name="return-down-forward-outline" size={16} color={colors.textMuted} />
                <Text className="flex-1 text-base text-text">{child.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {showAddChild ? (
          <View className="rounded-lg border border-border bg-surface p-4">
            <TextField
              label="Nombre de la sub-ubicación"
              value={childName}
              onChangeText={setChildName}
              placeholder="Ej. Estante B"
              autoFocus
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    setShowAddChild(false);
                    setChildName('');
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Agregar"
                  onPress={onAddChild}
                  loading={savingChild}
                  disabled={childName.trim().length === 0}
                />
              </View>
            </View>
          </View>
        ) : (
          <Button label="+ Agregar sub-ubicación" variant="secondary" onPress={() => setShowAddChild(true)} />
        )}
      </View>

      {!node.isPermanentDefault ? (
        <Button label="Eliminar ubicación" variant="destructive" onPress={onDelete} loading={deleting} />
      ) : null}
    </ScrollView>
  );
}
