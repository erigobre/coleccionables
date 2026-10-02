import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  acceptInvite,
  fetchMyInvites,
  rejectInvite,
  type OrganizationInvite,
} from '../../../../lib/organizations';
import { colors } from '../../../../theme/tokens';

export default function MyInvitesScreen() {
  const { accessToken } = useAuth();

  const [invites, setInvites] = useState<OrganizationInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    fetchMyInvites(accessToken)
      .then(setInvites)
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!invites) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const onAccept = async (invite: OrganizationInvite) => {
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

  const onReject = async (invite: OrganizationInvite) => {
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

  return (
    <Screen>
      <Text className="mb-6 text-sm text-textMuted">
        Si aceptas, te unes a esa familia de FrikiTokens: debes no tener tu propia suscripción activa ni tener ya a
        otros familiares dependiendo de ti.
      </Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {invites.length === 0 ? (
        <Text className="text-center text-sm text-textMuted">No tienes invitaciones pendientes.</Text>
      ) : (
        <View className="gap-3">
          {invites.map((invite) => (
            <View key={invite.id} className="rounded-lg border border-border bg-surface p-4">
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
                    onPress={() => onReject(invite)}
                    loading={respondingId === invite.id}
                  />
                </View>
                <View className="flex-1">
                  <Button label="Aceptar" onPress={() => onAccept(invite)} loading={respondingId === invite.id} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
