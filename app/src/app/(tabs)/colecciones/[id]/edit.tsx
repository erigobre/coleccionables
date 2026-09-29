import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { TextField } from '../../../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { COLLECTION_ICON_CHOICES, collectionIconName, type IconName } from '../../../../lib/collection-icons';
import {
  deleteCollection,
  fetchCollectionsForManagement,
  updateCollection,
  type Collection,
} from '../../../../lib/collections';
import { colors } from '../../../../theme/tokens';

// Editar una colección: nombre, ícono y eliminarla (moviendo antes sus objetos a otra colección).
export default function EditCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [all, setAll] = useState<Collection[] | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<IconName>(collectionIconName(null));
  const [deleting, setDeleting] = useState(false);
  const [migrateTo, setMigrateTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setError(null);
      const list = await fetchCollectionsForManagement(accessToken);
      const current = list.find((c) => c.id === id);
      if (!current) {
        setError('Colección no encontrada');
        return;
      }
      setAll(list);
      setName(current.name);
      setIcon(collectionIconName(current.icon));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const collection = all?.find((c) => c.id === id) ?? null;

  const onSave = async () => {
    if (!accessToken || !id || name.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await updateCollection(accessToken, id, { name: name.trim(), icon });
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!accessToken || !id || !collection) return;
    if (collection.itemCount > 0 && !migrateTo) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCollection(accessToken, id, migrateTo ?? undefined);
      // La colección ya no existe: se vuelve a la lista, no al detalle.
      router.dismissTo('/(tabs)/colecciones');
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  if (collection === null) {
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

  // Solo colecciones normales y activas pueden recibir los objetos.
  const targets = (all ?? []).filter((c) => c.id !== collection.id && !c.isSystem && c.status === 'ACTIVE');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 60, paddingHorizontal: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} editable={!busy} />

      <Text className="mb-2 text-xs uppercase tracking-wide text-textMuted">Ícono</Text>
      <View className="mb-6 flex-row flex-wrap gap-2">
        {COLLECTION_ICON_CHOICES.map((choice) => (
          <Pressable
            key={choice}
            onPress={() => setIcon(choice)}
            className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
              icon === choice ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'
            }`}
          >
            <Ionicons name={choice} size={18} color={icon === choice ? colors.primary : colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Button label="Guardar" onPress={onSave} loading={busy && !deleting} disabled={name.trim().length === 0 || busy} />

      <View className="mt-10 border-t border-border pt-6">
        {!deleting ? (
          <Button label="Eliminar colección" variant="destructive" onPress={() => setDeleting(true)} disabled={busy} />
        ) : (
          <View>
            <Text className="mb-3 text-sm text-text">
              {collection.itemCount > 0
                ? `Esta colección tiene ${collection.itemCount === 1 ? '1 objeto' : `${collection.itemCount} objetos`}. Elige a qué colección moverlos antes de eliminarla:`
                : `¿Eliminar "${collection.name}"? Esta acción no se puede deshacer.`}
            </Text>
            {collection.itemCount > 0 ? (
              targets.length === 0 ? (
                <Text className="mb-3 text-sm text-textMuted">
                  No tienes otra colección activa a la cual mover los objetos. Crea una primero desde Gestionar
                  colecciones.
                </Text>
              ) : (
                <View className="mb-4 flex-row flex-wrap gap-2">
                  {targets.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => setMigrateTo(c.id)}
                      className={`rounded-full border px-3 py-1.5 ${
                        migrateTo === c.id ? 'border-primary bg-surfaceElevated' : 'border-border'
                      }`}
                    >
                      <Text className={migrateTo === c.id ? 'text-sm text-primary' : 'text-sm text-textMuted'}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )
            ) : null}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    setDeleting(false);
                    setMigrateTo(null);
                  }}
                  disabled={busy}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Eliminar"
                  variant="destructive"
                  onPress={onConfirmDelete}
                  loading={busy}
                  disabled={collection.itemCount > 0 && !migrateTo}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
