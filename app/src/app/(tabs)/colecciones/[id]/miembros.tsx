import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TextField } from '../../../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  fetchCollection,
  fetchCollectionMembers,
  fetchMemberRemovalPreview,
  inviteCollectionMember,
  removeCollectionMember,
  type Collection,
  type CollectionMember,
} from '../../../../lib/collections';
import { colors } from '../../../../theme/tokens';

const ROLE_LABEL: Record<CollectionMember['role'], string> = {
  OWNER: 'Dueño',
  EDITOR: 'Editor',
  VIEWER: 'Solo lectura',
};

// Expulsar a un miembro (plan "Colecciones compartidas"): preview de cuántos
// objetos/ubicaciones suyos hay en la colección, y dos salidas — sacarlos de
// inmediato o transferirlos (vía el sistema de Transfer ya existente) a otro
// miembro, que deberá aceptar.
function RemovalModal({
  accessToken,
  collectionId,
  member,
  otherMembers,
  onClose,
  onDone,
}: {
  accessToken: string;
  collectionId: string;
  member: CollectionMember;
  otherMembers: CollectionMember[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<{ itemCount: number; locationCount: number } | null>(null);
  const [step, setStep] = useState<'confirm' | 'pick-recipient'>('confirm');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberRemovalPreview(accessToken, collectionId, member.user.id)
      .then(setPreview)
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken, collectionId, member.user.id]);

  const detach = async () => {
    setBusy(true);
    setError(null);
    try {
      await removeCollectionMember(accessToken, collectionId, member.user.id, { mode: 'DETACH' });
      onDone();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const transfer = async () => {
    if (!recipientId) return;
    setBusy(true);
    setError(null);
    try {
      await removeCollectionMember(accessToken, collectionId, member.user.id, {
        mode: 'TRANSFER',
        transferToUserId: recipientId,
      });
      onDone();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-[420px] rounded-2xl bg-surface p-6">
          <Text className="text-center font-display text-lg uppercase text-primary">
            {step === 'confirm' ? `Expulsar a ${member.user.name}` : 'Elige a quién transferir'}
          </Text>

          {step === 'confirm' ? (
            <>
              {preview === null ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
              ) : (
                <Text className="mb-5 mt-2 text-center text-sm text-textSecondary">
                  {preview.itemCount === 0
                    ? `${member.user.name} no tiene objetos en esta colección.`
                    : `${member.user.name} tiene ${preview.itemCount === 1 ? '1 objeto' : `${preview.itemCount} objetos`} en ${
                        preview.locationCount === 1 ? '1 ubicación' : `${preview.locationCount} ubicaciones`
                      } dentro de esta colección.`}
                </Text>
              )}
              {error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null}
              <View className="gap-3">
                <Button label="Sacar los objetos" onPress={detach} loading={busy} disabled={preview === null} />
                {preview && preview.itemCount > 0 ? (
                  <Button
                    label="Transferir los objetos"
                    variant="secondary"
                    onPress={() => setStep('pick-recipient')}
                    disabled={busy}
                  />
                ) : null}
                <Button label="Cancelar" variant="ghost" onPress={onClose} disabled={busy} />
              </View>
            </>
          ) : (
            <>
              <Text className="mb-4 mt-2 text-center text-sm text-textSecondary">
                Deberá aceptar la transferencia de cada objeto, igual que al transferir uno manualmente.
              </Text>
              <View className="mb-4 rounded-lg border border-border">
                {otherMembers.map((m, index) => (
                  <Pressable
                    key={m.user.id}
                    onPress={() => setRecipientId(m.user.id)}
                    className={`flex-row items-center justify-between px-3 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
                  >
                    <Text className="text-sm text-text">
                      {m.user.name} <Text className="text-textMuted">@{m.user.username}</Text>
                    </Text>
                    <Ionicons
                      name={recipientId === m.user.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={recipientId === m.user.id ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
              {error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null}
              <View className="gap-3">
                <Button label="Confirmar transferencia" onPress={transfer} loading={busy} disabled={!recipientId} />
                <Button label="Cancelar" variant="ghost" onPress={onClose} disabled={busy} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CollectionMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useAuth();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [members, setMembers] = useState<CollectionMember[] | null>(null);
  const [username, setUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removalTarget, setRemovalTarget] = useState<CollectionMember | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      setError(null);
      const [found, list] = await Promise.all([
        fetchCollection(accessToken, id),
        fetchCollectionMembers(accessToken, id),
      ]);
      setCollection(found as Collection);
      setMembers(list);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!collection && !!user && collection.ownerId === user.sub;
  const maxReached = (members?.length ?? 0) >= 5;

  const onInvite = async () => {
    if (!accessToken || !id || !username.trim()) return;
    const targetUsername = username.trim().replace(/^@/, '');
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      await inviteCollectionMember(accessToken, id, targetUsername);
      setUsername('');
      setNotice(`Invitación enviada a @${targetUsername}.`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  if (collection === null || members === null) {
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

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 60, paddingHorizontal: 20 }}
    >
      <Text className="mb-4 text-sm text-textMuted">
        Un objeto agregado por cualquier miembro se vuelve visible para todo el grupo (y su ubicación, de solo
        lectura), pero siempre conserva a su dueño real.
      </Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {members.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Aún no hay miembros"
          description="Invita a alguien por su @usuario para compartir esta colección."
        />
      ) : (
        <View className="mb-6 rounded-lg border border-border bg-surface">
          {members.map((member, index) => (
            <View
              key={member.user.id}
              className={`flex-row items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              <View className="flex-1">
                <Text className="font-body-bold text-sm text-text">{member.user.name}</Text>
                <Text className="text-xs text-textMuted">
                  @{member.user.username} · {ROLE_LABEL[member.role]}
                </Text>
              </View>
              {isOwner && member.user.id !== user?.sub ? (
                <Pressable
                  onPress={() => setRemovalTarget(member)}
                  accessibilityLabel={`Expulsar a ${member.user.name}`}
                  className="h-9 w-9 items-center justify-center rounded-full bg-surfaceElevated active:opacity-80"
                >
                  <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {isOwner ? (
        <View className="border-t border-border pt-5">
          <TextField
            label="Invitar por @usuario"
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              setNotice(null);
            }}
            placeholder="@usuario"
            editable={!maxReached}
          />
          {maxReached ? (
            <Text className="mb-3 text-xs text-textMuted">Esta colección ya alcanzó el máximo de miembros.</Text>
          ) : null}
          {notice ? <Text className="mb-3 text-sm text-textSecondary">{notice}</Text> : null}
          <Button
            label="Invitar"
            onPress={onInvite}
            loading={inviting}
            disabled={!username.trim() || maxReached}
          />
        </View>
      ) : null}

      {removalTarget ? (
        <RemovalModal
          accessToken={accessToken!}
          collectionId={id}
          member={removalTarget}
          otherMembers={members.filter((m) => m.user.id !== removalTarget.user.id)}
          onClose={() => setRemovalTarget(null)}
          onDone={() => {
            setRemovalTarget(null);
            load();
          }}
        />
      ) : null}
    </ScrollView>
  );
}
