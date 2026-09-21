import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import {
  COLLECTION_ICON_CHOICES,
  DEFAULT_COLLECTION_ICON,
  collectionIconName,
  type IconName,
} from '../../../lib/collection-icons';
import {
  activateCollection,
  createCollection,
  deleteCollection,
  fetchCollectionsForManagement,
  suspendCollection,
  updateCollection,
  type Collection,
} from '../../../lib/collections';
import { colors } from '../../../theme/tokens';

function IconChoiceRow({ selected, onSelect }: { selected: IconName; onSelect: (icon: IconName) => void }) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {COLLECTION_ICON_CHOICES.map((icon) => (
        <Pressable
          key={icon}
          onPress={() => onSelect(icon)}
          className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
            selected === icon ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'
          }`}
        >
          <Ionicons name={icon} size={18} color={selected === icon ? colors.primary : colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

function CollectionManageRow({
  collection,
  otherCollections,
  accessToken,
  onChanged,
}: {
  collection: Collection;
  otherCollections: Collection[];
  accessToken: string;
  onChanged: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [name, setName] = useState(collection.name);
  const [icon, setIcon] = useState<IconName>(collectionIconName(collection.icon));
  const [migrateTo, setMigrateTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAndClose = () => {
    setMode('view');
    setName(collection.name);
    setIcon(collectionIconName(collection.icon));
    setMigrateTo(null);
    setError(null);
  };

  const onSaveEdit = async () => {
    if (name.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await updateCollection(accessToken, collection.id, { name: name.trim(), icon });
      setMode('view');
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onToggleStatus = async () => {
    setBusy(true);
    setError(null);
    try {
      if (collection.status === 'ACTIVE') {
        await suspendCollection(accessToken, collection.id);
      } else {
        await activateCollection(accessToken, collection.id);
      }
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    if (collection.itemCount > 0 && !migrateTo) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCollection(accessToken, collection.id, migrateTo ?? undefined);
      await onChanged();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <View className="border-b border-border px-4 py-3">
      {mode === 'edit' ? (
        <View>
          <TextField label="Nombre" value={name} onChangeText={setName} autoFocus />
          <Text className="mb-2 text-xs uppercase tracking-wide text-textMuted">Ícono</Text>
          <IconChoiceRow selected={icon} onSelect={setIcon} />
          {error ? <Text className="mb-2 text-sm text-danger">{error}</Text> : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={resetAndClose} />
            </View>
            <View className="flex-1">
              <Button label="Guardar" onPress={onSaveEdit} loading={busy} disabled={name.trim().length === 0} />
            </View>
          </View>
        </View>
      ) : mode === 'delete' ? (
        <View>
          <Text className="mb-3 text-sm text-text">
            {collection.itemCount > 0
              ? `Esta colección tiene ${collection.itemCount} objeto(s). Elige a dónde moverlos antes de eliminarla:`
              : `¿Eliminar "${collection.name}"? Esta acción no se puede deshacer.`}
          </Text>
          {collection.itemCount > 0 ? (
            <View className="mb-3 flex-row flex-wrap gap-2">
              {otherCollections.map((c) => (
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
          ) : null}
          {error ? <Text className="mb-2 text-sm text-danger">{error}</Text> : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={resetAndClose} />
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
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Ionicons name={collectionIconName(collection.icon)} size={18} color={colors.white} />
          </View>
          <View className="flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="font-body-bold text-base text-text">{collection.name}</Text>
              {collection.isDefault ? (
                <View className="rounded-full bg-surfaceElevated px-2 py-0.5">
                  <Text className="text-[11px] text-textMuted">Default</Text>
                </View>
              ) : null}
              {collection.status === 'SUSPENDED' ? (
                <View className="rounded-full bg-danger px-2 py-0.5">
                  <Text className="text-[11px] text-dangerText">Suspendida</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs text-textMuted">
              {collection.itemCount === 1 ? '1 objeto' : `${collection.itemCount} objetos`}
            </Text>
          </View>
          <Pressable onPress={() => setMode('edit')} className="p-2" disabled={busy}>
            <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={onToggleStatus} className="p-2" disabled={busy}>
            <Ionicons
              name={collection.status === 'ACTIVE' ? 'pause-circle-outline' : 'play-circle-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => setMode('delete')} className="p-2" disabled={busy}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function ManageCollectionsScreen() {
  const { accessToken } = useAuth();
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createIcon, setCreateIcon] = useState<IconName>(DEFAULT_COLLECTION_ICON);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setCollections(await fetchCollectionsForManagement(accessToken));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resetCreateForm = () => {
    setShowCreate(false);
    setCreateName('');
    setCreateIcon(DEFAULT_COLLECTION_ICON);
  };

  const onCreate = async () => {
    if (!accessToken || createName.trim().length === 0) return;
    setError(null);
    setCreating(true);
    try {
      await createCollection(accessToken, { name: createName.trim(), icon: createIcon });
      resetCreateForm();
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  if (collections === null || !accessToken) {
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
        Renombra, cambia el ícono, suspende (se oculta del grid pero no admite objetos nuevos) o elimina tus
        colecciones. Las colecciones por default también se pueden editar.
      </Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-6 rounded-lg border border-border bg-surface">
        {collections.map((collection) => (
          <CollectionManageRow
            key={collection.id}
            collection={collection}
            otherCollections={collections.filter((c) => c.id !== collection.id)}
            accessToken={accessToken}
            onChanged={load}
          />
        ))}
      </View>

      {showCreate ? (
        <View className="rounded-lg border border-border bg-surface p-4">
          <TextField
            label="Nombre de la colección"
            value={createName}
            onChangeText={setCreateName}
            placeholder="Ej. Funkos"
            autoFocus
          />
          <Text className="mb-2 text-xs uppercase tracking-wide text-textMuted">Ícono</Text>
          <IconChoiceRow selected={createIcon} onSelect={setCreateIcon} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button label="Cancelar" variant="ghost" onPress={resetCreateForm} />
            </View>
            <View className="flex-1">
              <Button
                label="Crear"
                onPress={onCreate}
                loading={creating}
                disabled={createName.trim().length === 0}
              />
            </View>
          </View>
        </View>
      ) : (
        <Button label="+ Nueva colección" onPress={() => setShowCreate(true)} />
      )}
    </ScrollView>
  );
}
