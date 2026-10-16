import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { LocationIconPicker } from '../../../../components/ui/LocationIconPicker';
import { TextField } from '../../../../components/ui/TextField';
import { colors } from '../../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  createLocation,
  DEFAULT_LOCATION_ICON,
  deleteLocation,
  fetchLocationQr,
  fetchLocationShares,
  fetchLocationTree,
  fetchShareCandidates,
  revokeLocationShare,
  shareLocation,
  updateLocation,
  type LocationIconKey,
  type LocationNode,
  type LocationShare,
  type ShareCandidate,
} from '../../../../lib/locations';

const SHARE_ROLE_LABEL: Record<'VIEWER' | 'EDITOR', string> = {
  VIEWER: 'Solo ver',
  EDITOR: 'Puede agregar objetos',
};

// Sección "Compartir con..." (caso "vivimos juntos"): solo para ubicaciones
// propias. Lista quién ya tiene acceso manual y permite agregar a cualquier
// compañero de colección compartida con el rol Solo ver / Puede agregar.
function ShareSection({ accessToken, locationId }: { accessToken: string; locationId: string }) {
  const [shares, setShares] = useState<LocationShare[] | null>(null);
  const [candidates, setCandidates] = useState<ShareCandidate[] | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [shareList, candidateList] = await Promise.all([
        fetchLocationShares(accessToken, locationId),
        fetchShareCandidates(accessToken),
      ]);
      setShares(shareList);
      setCandidates(candidateList);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, locationId]);

  useEffect(() => {
    load();
  }, [load]);

  const onShare = async (userId: string, role: 'VIEWER' | 'EDITOR') => {
    setError(null);
    setBusyUserId(userId);
    try {
      await shareLocation(accessToken, locationId, { userId, role });
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyUserId(null);
    }
  };

  const onRevoke = async (userId: string) => {
    setError(null);
    setBusyUserId(userId);
    try {
      await revokeLocationShare(accessToken, locationId, userId);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyUserId(null);
    }
  };

  if (shares === null || candidates === null) {
    return error ? <Text className="text-sm text-danger">{error}</Text> : null;
  }

  const sharedUserIds = new Set(shares.map((s) => s.userId));
  const availableCandidates = candidates.filter((c) => !sharedUserIds.has(c.id));

  return (
    <View className="mb-6">
      <Text className="mb-3 text-sm font-semibold text-text">Compartir con...</Text>
      <Text className="mb-3 text-xs text-textMuted">
        Para el caso de "vivimos juntos": comparte esta ubicación con alguien con quien ya compartes una colección.
      </Text>

      {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}

      {shares.length > 0 ? (
        <View className="mb-3 rounded-lg border border-border bg-surface">
          {shares.map((share, index) => (
            <View
              key={share.userId}
              className={`flex-row items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-1">
                <Text className="font-body-bold text-sm text-text">{share.user.name}</Text>
                <Text className="text-xs text-textMuted">{SHARE_ROLE_LABEL[share.role]}</Text>
              </View>
              <Pressable
                onPress={() => onRevoke(share.userId)}
                disabled={busyUserId === share.userId}
                accessibilityLabel={`Dejar de compartir con ${share.user.name}`}
                className="h-9 w-9 items-center justify-center rounded-full bg-surfaceElevated active:opacity-80"
              >
                <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {availableCandidates.length === 0 ? (
        <Text className="text-sm text-textMuted">
          {candidates.length === 0
            ? 'Solo puedes compartir con compañeros de una colección compartida.'
            : 'Ya compartiste esta ubicación con todos tus compañeros de colección.'}
        </Text>
      ) : (
        <View className="rounded-lg border border-border bg-surface">
          {availableCandidates.map((candidate, index) => (
            <View
              key={candidate.id}
              className={`flex-row items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-1">
                <Text className="text-sm text-text">{candidate.name}</Text>
                {candidate.username ? <Text className="text-xs text-textMuted">@{candidate.username}</Text> : null}
              </View>
              <Pressable
                onPress={() => onShare(candidate.id, 'VIEWER')}
                disabled={busyUserId === candidate.id}
                className="rounded-full bg-surfaceElevated px-3 py-1.5"
              >
                <Text className="text-xs text-text">Solo ver</Text>
              </Pressable>
              <Pressable
                onPress={() => onShare(candidate.id, 'EDITOR')}
                disabled={busyUserId === candidate.id}
                className="rounded-full bg-primary px-3 py-1.5"
              >
                <Text className="text-xs text-white">Puede agregar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

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
  const [icon, setIcon] = useState<LocationIconKey>(DEFAULT_LOCATION_ICON);
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [savingChild, setSavingChild] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [sharingQr, setSharingQr] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const tree = await fetchLocationTree(accessToken);
      const found = findNode(tree, id);
      setNode(found ?? null);
      if (found) {
        setName(found.name);
        setIcon((found.icon as LocationIconKey | null) ?? DEFAULT_LOCATION_ICON);
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

  const onSaveName = async () => {
    if (!accessToken || !node || name.trim().length === 0) return;
    setError(null);
    setSavingName(true);
    try {
      await updateLocation(accessToken, node.id, { name: name.trim(), icon });
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

  const onShareQr = async () => {
    if (!qrImage || !node) return;
    setError(null);
    setSharingQr(true);
    try {
      const base64 = qrImage.split(',')[1] ?? qrImage;
      const file = new File(Paths.cache, `ubicacion-${node.id}-qr.png`);
      if (file.exists) file.delete();
      file.create();
      file.write(base64, { encoding: 'base64' });
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: 'Compartir código QR' });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSharingQr(false);
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

  // Ubicación ajena (compartida conmigo): vista de solo lectura, sin edición
  // ni "Compartir con..." — eso solo lo puede hacer el dueño real.
  if (node.isShared) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, paddingHorizontal: 20 }}
      >
        <Text className="mb-2 font-display text-[22px] uppercase tracking-wide text-text">{node.name}</Text>
        <View className="mb-6 flex-row items-center gap-1.5 self-start rounded-full bg-surfaceElevated px-3 py-1">
          <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
          <Text className="text-xs text-textMuted">
            Compartido por {node.sharedByName} · {node.myRole === 'EDITOR' ? 'Puede agregar objetos' : 'Solo ver'}
          </Text>
        </View>

        {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

        {node.children.length > 0 ? (
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
        ) : null}
      </ScrollView>
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
          <LocationIconPicker value={icon} onChange={setIcon} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={() => {
                  setRenaming(false);
                  setName(node.name);
                  setIcon((node.icon as LocationIconKey | null) ?? DEFAULT_LOCATION_ICON);
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
          <View className="gap-3">
            <View className="items-center rounded-md bg-white p-3">
              <Image source={{ uri: qrImage }} style={{ width: 180, height: 180 }} resizeMode="contain" />
            </View>
            <Button label="Compartir QR" variant="secondary" onPress={onShareQr} loading={sharingQr} />
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

      {accessToken ? <ShareSection accessToken={accessToken} locationId={node.id} /> : null}

      {!node.isPermanentDefault ? (
        <Button label="Eliminar ubicación" variant="destructive" onPress={onDelete} loading={deleting} />
      ) : null}
    </ScrollView>
  );
}
