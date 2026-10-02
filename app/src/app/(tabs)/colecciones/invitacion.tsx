import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { acceptCollectionInvite } from '../../../lib/collections';

// Llega desde la notificación push de invitación (ver useNotificationNavigation
// en _layout.tsx). No se puede pedir GET /collections/:id antes de aceptar
// (está protegido por membership), así que el nombre viaja en los params de la
// notificación en vez de pedirse a la API.
export default function CollectionInviteScreen() {
  const { collectionId, collectionName } = useLocalSearchParams<{ collectionId: string; collectionName?: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAccept = async () => {
    if (!accessToken || !collectionId) return;
    setBusy(true);
    setError(null);
    try {
      await acceptCollectionInvite(accessToken, collectionId);
      router.replace(`/(tabs)/colecciones/${collectionId}`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Text className="mb-3 text-center font-display text-lg uppercase text-primary">Invitación a colección</Text>
      <Text className="mb-8 text-center text-sm text-textSecondary">
        Te invitaron a unirte a {collectionName ? `"${collectionName}"` : 'una colección compartida'}. Al aceptar,
        tus objetos que agregues ahí serán visibles para todo el grupo.
      </Text>
      {error ? <Text className="mb-4 text-center text-sm text-danger">{error}</Text> : null}
      <View className="w-full gap-3">
        <Button label="Aceptar invitación" onPress={onAccept} loading={busy} />
        <Button label="Ahora no" variant="ghost" onPress={() => router.replace('/(tabs)/colecciones')} disabled={busy} />
      </View>
    </View>
  );
}
