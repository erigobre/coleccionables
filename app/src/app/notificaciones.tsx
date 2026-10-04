import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../context/auth-context';
import {
  acceptCollectionInvite,
  fetchMyCollectionInvites,
  rejectCollectionInvite,
  type CollectionInvite,
} from '../lib/collections';
import { acceptInvite, fetchMyInvites, rejectInvite, type OrganizationInvite } from '../lib/organizations';
import { colors } from '../theme/tokens';

// Pantalla de "pendientes por aceptar/rechazar" (decisión confirmada con el
// usuario 2026-10-02: no es un historial de notificaciones, solo lo que
// requiere una acción suya). Junta las dos cosas que hoy solo se pueden
// aceptar tocando el push exacto si llega: invitaciones a colecciones
// compartidas e invitaciones a familia de FrikiTokens.
export default function NotificationsScreen() {
  const { accessToken } = useAuth();

  const [collectionInvites, setCollectionInvites] = useState<CollectionInvite[] | null>(null);
  const [orgInvites, setOrgInvites] = useState<OrganizationInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([fetchMyCollectionInvites(accessToken), fetchMyInvites(accessToken)])
      .then(([collections, orgs]) => {
        setCollectionInvites(collections);
        setOrgInvites(orgs);
      })
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (collectionInvites === null || orgInvites === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const onAcceptCollection = async (invite: CollectionInvite) => {
    if (!accessToken) return;
    setError(null);
    setRespondingId(invite.id);
    try {
      await acceptCollectionInvite(accessToken, invite.collectionId);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

  const onRejectCollection = async (invite: CollectionInvite) => {
    if (!accessToken) return;
    setError(null);
    setRespondingId(invite.id);
    try {
      await rejectCollectionInvite(accessToken, invite.collectionId);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

  const onAcceptOrg = async (invite: OrganizationInvite) => {
    if (!accessToken) return;
    setError(null);
    setRespondingId(invite.id);
    try {
      await acceptInvite(accessToken, invite.id);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

  const onRejectOrg = async (invite: OrganizationInvite) => {
    if (!accessToken) return;
    setError(null);
    setRespondingId(invite.id);
    try {
      await rejectInvite(accessToken, invite.id);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

  const isEmpty = collectionInvites.length === 0 && orgInvites.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 60, paddingHorizontal: 20 }}
    >
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {isEmpty ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="Todo al día"
          description="No tienes nada pendiente por aceptar o rechazar."
        />
      ) : (
        <View className="gap-3">
          {collectionInvites.map((invite) => (
            <View key={`collection-${invite.id}`} className="rounded-lg border border-border bg-surface p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <Ionicons name="albums-outline" size={18} color={colors.primary} />
                <Text className="flex-1 text-sm text-text">
                  <Text className="font-body-bold">{invite.invitedByUser.name}</Text> te invitó a la colección
                  compartida "{invite.collection.name}"
                </Text>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label="Rechazar"
                    variant="ghost"
                    onPress={() => onRejectCollection(invite)}
                    loading={respondingId === invite.id}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Aceptar"
                    onPress={() => onAcceptCollection(invite)}
                    loading={respondingId === invite.id}
                  />
                </View>
              </View>
            </View>
          ))}

          {orgInvites.map((invite) => (
            <View key={`org-${invite.id}`} className="rounded-lg border border-border bg-surface p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text className="flex-1 text-sm text-text">
                  <Text className="font-body-bold">{invite.invitedByUser.name}</Text> te invitó a su familia de
                  FrikiTokens ({invite.organization.name})
                </Text>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label="Rechazar"
                    variant="ghost"
                    onPress={() => onRejectOrg(invite)}
                    loading={respondingId === invite.id}
                  />
                </View>
                <View className="flex-1">
                  <Button label="Aceptar" onPress={() => onAcceptOrg(invite)} loading={respondingId === invite.id} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
