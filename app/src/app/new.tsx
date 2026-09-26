import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { ItemFormFields } from '../components/items/ItemFormFields';
import { TagAutocomplete } from '../components/items/TagAutocomplete';
import { authErrorMessage, useAuth } from '../context/auth-context';
import { resolvePhotoUrl } from '../lib/api';
import { getItemDraft } from '../lib/item-draft';
import { EMPTY_ITEM_FORM, itemFormIsValid, itemFormToCreateDto, type ItemFormValues } from '../lib/item-form';
import { fetchActiveCollections, type Collection } from '../lib/collections';
import { flattenLocationTree, fetchLocationTree, type LocationNode } from '../lib/locations';
import { createItem } from '../lib/items';
import { findOrCreateTag, searchTags, type Tag } from '../lib/tags';
import { colors } from '../theme/tokens';

function LocationChipList({
  options,
  value,
  onChange,
}: {
  options: { node: LocationNode; depth: number }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      <Pressable
        onPress={() => onChange(null)}
        className={`rounded-full border px-3 py-2 ${value === null ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'}`}
      >
        <Text className={`text-sm ${value === null ? 'text-primary' : 'text-textMuted'}`}>Sin ubicación</Text>
      </Pressable>
      {options.map(({ node, depth }) => (
        <Pressable
          key={node.id}
          onPress={() => onChange(node.id)}
          className={`rounded-full border px-3 py-2 ${value === node.id ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'}`}
        >
          <Text className={`text-sm ${value === node.id ? 'text-primary' : 'text-textMuted'}`}>
            {'— '.repeat(depth)}
            {node.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CollectionChipList({
  collections,
  selected,
  onToggle,
}: {
  collections: Collection[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (collections.length === 0) {
    return <Text className="mb-4 text-sm text-textMuted">Aún no tienes colecciones.</Text>;
  }
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {collections.map((collection) => {
        const isSelected = selected.includes(collection.id);
        return (
          <Pressable
            key={collection.id}
            onPress={() => onToggle(collection.id)}
            className={`rounded-full border px-3 py-2 ${isSelected ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'}`}
          >
            <Text className={`text-sm ${isSelected ? 'text-primary' : 'text-textMuted'}`}>{collection.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewItemScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  // Borrador que dejó la pantalla de captura (fotos + prellenado IA); vacío si
  // se llegó sin pasar por ella.
  const [draft] = useState(getItemDraft);
  const photoUrls = draft?.photoUrls ?? [];

  const [values, setValues] = useState<ItemFormValues>(draft?.values ?? EMPTY_ITEM_FORM);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  // Tags ya existentes elegidos para este objeto (autocomplete, no un catálogo
  // completo: con miles de tags no tiene sentido cargarlos todos de un jalón).
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  // Tags sugeridos por la IA (o escritos a mano) que aún no existen: se crean
  // hasta guardar, para no dejar tags huérfanos si el usuario abandona el formulario.
  const [pendingTagNames, setPendingTagNames] = useState<string[]>([]);

  const [locations, setLocations] = useState<LocationNode[] | null>(null);
  const [collections, setCollections] = useState<Collection[] | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El llenado manual debe estar disponible siempre: si alguna de estas tres
  // listas falla (red inestable, etc.) se cae a vacío en vez de dejar el
  // formulario bloqueado para siempre en la pantalla de error.
  const loadFormData = useCallback(() => {
    if (!accessToken) return;
    setError(null);
    fetchLocationTree(accessToken)
      .then(setLocations)
      .catch((err) => {
        setError(authErrorMessage(err));
        setLocations([]);
      });
    fetchActiveCollections(accessToken)
      .then(setCollections)
      .catch((err) => {
        setError(authErrorMessage(err));
        setCollections([]);
      });

    // Los tags sugeridos por la IA se resuelven uno por uno contra el buscador
    // (no hay un catálogo completo cargado): si ya existe un tag con ese
    // nombre se preselecciona, si no, queda pendiente de crear al guardar.
    const suggested = draft?.suggestedTags ?? [];
    if (suggested.length > 0) {
      Promise.all(suggested.map((name) => searchTags(accessToken, name).catch(() => [] as Tag[])))
        .then((resultsByName) => {
          const preselected: Tag[] = [];
          const pending: string[] = [];
          suggested.forEach((name, index) => {
            const match = resultsByName[index].find((tag) => tag.name.toLowerCase() === name.toLowerCase());
            if (match) preselected.push(match);
            else pending.push(name);
          });
          setSelectedTags(preselected);
          setPendingTagNames(pending);
        })
        .catch(() => {
          setPendingTagNames(suggested);
        });
    }
  }, [accessToken, draft]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const onChange = <K extends keyof ItemFormValues>(field: K, value: ItemFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCollection = (id: string) => {
    setCollectionIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const onSave = async () => {
    if (!accessToken || !itemFormIsValid(values)) return;
    setSaving(true);
    setError(null);
    try {
      const createdTags = await Promise.all(
        pendingTagNames.map((name) =>
          findOrCreateTag(accessToken, name, /^color/i.test(name) ? 'COLOR_PRINCIPAL' : undefined),
        ),
      );
      const allTagIds = [...selectedTags.map((tag) => tag.id), ...createdTags.map((tag) => tag.id)];
      const dto = itemFormToCreateDto(values, {
        locationId: locationId ?? undefined,
        collectionIds: collectionIds.length ? collectionIds : undefined,
        tagIds: allTagIds.length ? allTagIds : undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        avatarUrl: draft?.avatarUrl,
      });
      const item = await createItem(accessToken, dto);
      // `new` vive fuera de los tabs (ver root _layout.tsx), así que un simple
      // replace hacia una ruta anidada en (tabs) rompe el historial interno de
      // Objetos y el "atrás" cae fuera de los tabs. dismissTo primero vuelve a
      // la lista de Objetos tal cual estaba (con su filtro/búsqueda intactos)
      // y luego se apila el detalle encima, así "atrás" regresa a esa lista.
      router.dismissTo('/(tabs)/objetos');
      router.push(`/(tabs)/objetos/${item.id}`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (locations === null || collections === null) {
    if (error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
          <Text className="text-center text-sm text-danger">{error}</Text>
          <Button label="Reintentar" onPress={loadFormData} />
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
      keyboardShouldPersistTaps="handled"
    >
      {photoUrls.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-grow-0">
          {photoUrls.map((url) => (
            <Image
              key={url}
              source={{ uri: resolvePhotoUrl(url) }}
              style={{ width: 96, height: 96, borderRadius: 12, marginRight: 8 }}
            />
          ))}
        </ScrollView>
      ) : null}

      <Text className="mb-4 text-sm text-textMuted">
        {draft?.notice ?? 'Llena los datos manualmente.'} Los campos marcados con * son obligatorios.
      </Text>

      <ItemFormFields values={values} onChange={onChange} showUniqueIdentifier={draft?.source === 'barcode'} />

      <Text className="mb-1.5 text-sm font-medium text-textSecondary">Ubicación</Text>
      <LocationChipList options={flattenLocationTree(locations)} value={locationId} onChange={setLocationId} />

      <Text className="mb-1.5 text-sm font-medium text-textSecondary">Colecciones</Text>
      <CollectionChipList collections={collections} selected={collectionIds} onToggle={toggleCollection} />

      <Text className="mb-1.5 text-sm font-medium text-textSecondary">Tags</Text>
      {selectedTags.length > 0 || pendingTagNames.length > 0 ? (
        <View className="mb-2 flex-row flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id))}
              className="flex-row items-center gap-1 rounded-full border border-primary bg-surfaceElevated px-3 py-2"
            >
              <Text className="text-sm text-primary">{tag.name}</Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
          {pendingTagNames.map((name) => (
            <Pressable
              key={name}
              onPress={() => setPendingTagNames((prev) => prev.filter((n) => n !== name))}
              className="flex-row items-center gap-1 rounded-full border border-primary bg-surfaceElevated px-3 py-2"
            >
              <Text className="text-sm text-primary">{name}</Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {accessToken ? (
        <TagAutocomplete
          accessToken={accessToken}
          excludeNames={[...selectedTags.map((tag) => tag.name), ...pendingTagNames]}
          onSelectExisting={(tag) => setSelectedTags((prev) => [...prev, tag])}
          onCreateNew={(name) => setPendingTagNames((prev) => [...prev, name])}
        />
      ) : null}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Guardar objeto" onPress={onSave} loading={saving} disabled={!itemFormIsValid(values)} />
    </ScrollView>
  );
}
