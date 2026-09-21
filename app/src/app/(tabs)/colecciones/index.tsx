import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Screen } from '../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { collectionIconName } from '../../../lib/collection-icons';
import { fetchActiveCollections, type Collection } from '../../../lib/collections';
import { colors } from '../../../theme/tokens';

function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <View className="mb-4 w-[48%] rounded-xl bg-surface p-4">
      <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Ionicons name={collectionIconName(collection.icon)} size={22} color={colors.white} />
      </View>
      <Text className="font-body-bold text-base text-text" numberOfLines={2}>
        {collection.name}
      </Text>
      <Text className="mt-1 text-xs text-textMuted">
        {collection.itemCount === 1 ? '1 objeto' : `${collection.itemCount} objetos`}
      </Text>
    </View>
  );
}

export default function ColeccionesScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setCollections(await fetchActiveCollections(accessToken));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (collections === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Screen>
      <Text className="mb-4 font-display text-[22px] uppercase tracking-wide text-text">Colecciones</Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {collections.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="Aún no tienes colecciones"
          description="Crea tu primera colección desde la pantalla de gestión."
        />
      ) : (
        <View className="mb-6 flex-row flex-wrap justify-between">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </View>
      )}

      <Button
        label="Gestionar colecciones"
        variant="ghost"
        onPress={() => router.push('/(tabs)/colecciones/manage')}
      />
    </Screen>
  );
}
