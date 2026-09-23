import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { TextField } from '../ui/TextField';
import { searchTags, type Tag } from '../../lib/tags';
import { colors } from '../../theme/tokens';

interface TagAutocompleteProps {
  accessToken: string;
  // Nombres a excluir de las sugerencias (ya seleccionados/vinculados en este objeto).
  excludeNames: string[];
  onSelectExisting: (tag: Tag) => void;
  onCreateNew: (name: string) => void;
  placeholder?: string;
}

// Con potencialmente miles de tags por usuario, ya no tiene sentido pedirlos
// todos de un jalón para pintarlos como chips (como antes): se buscan por
// texto, igual que se busca un contacto, y solo aparecen como sugerencia los
// que coinciden con lo que se va escribiendo.
export function TagAutocomplete({ accessToken, excludeNames, onSelectExisting, onCreateNew, placeholder }: TagAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      searchTags(accessToken, text)
        .then((tags) => {
          if (requestId.current !== id) return;
          setResults(tags);
        })
        .catch(() => {
          if (requestId.current === id) setResults([]);
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, accessToken]);

  const trimmed = query.trim();
  const excluded = new Set(excludeNames.map((name) => name.toLowerCase()));
  const visibleResults = results.filter((tag) => !excluded.has(tag.name.toLowerCase()));
  const exactMatch = results.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length >= 2 && !loading && !exactMatch;

  const selectTag = (tag: Tag) => {
    onSelectExisting(tag);
    setQuery('');
    setResults([]);
  };

  const createTag = () => {
    if (!canCreate) return;
    onCreateNew(trimmed);
    setQuery('');
    setResults([]);
  };

  return (
    <View className="mb-2">
      <TextField
        label="Agregar tag"
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? 'Buscar o crear tag…'}
        onSubmitEditing={canCreate ? createTag : undefined}
      />
      {loading ? <ActivityIndicator className="mb-2" color={colors.primary} /> : null}
      {visibleResults.length > 0 ? (
        <View className="mb-2 gap-1">
          {visibleResults.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => selectTag(tag)}
              className="rounded-md border border-border bg-surfaceElevated px-3 py-2"
            >
              <Text className="text-sm text-text">{tag.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {canCreate ? (
        <Pressable
          onPress={createTag}
          className="mb-2 rounded-md border border-dashed border-primary px-3 py-2"
        >
          <Text className="text-sm text-primary">Crear tag "{trimmed}"</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
