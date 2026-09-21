import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { ChipSelect } from '../../../components/ui/ChipSelect';
import { EmptyState } from '../../../components/ui/EmptyState';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { resolvePhotoUrl } from '../../../lib/api';
import { fetchActiveCollections, type Collection } from '../../../lib/collections';
import {
  acceptTransfer,
  cancelTransfer,
  fetchIncomingTransfers,
  fetchOutgoingTransfers,
  rejectTransfer,
  type IncomingTransfer,
  type OutgoingTransfer,
  type TransferStatus,
} from '../../../lib/transfers';
import { colors } from '../../../theme/tokens';

const STATUS_LABEL: Record<TransferStatus, string> = {
  PENDING: 'Esperando respuesta',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

function Thumb({ photoUrl }: { photoUrl?: string }) {
  return photoUrl ? (
    <Image source={{ uri: resolvePhotoUrl(photoUrl) }} style={{ width: 72, height: 72, borderRadius: 12 }} />
  ) : (
    <View style={{ width: 72, height: 72, borderRadius: 12 }} className="items-center justify-center bg-surfaceElevated">
      <Ionicons name="image-outline" size={24} color={colors.textMuted} />
    </View>
  );
}

export default function TransferenciasScreen() {
  const { accessToken } = useAuth();
  const [incoming, setIncoming] = useState<IncomingTransfer[] | null>(null);
  const [outgoing, setOutgoing] = useState<OutgoingTransfer[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Transferencia que se está aceptando (paso de elegir colección) y su elección.
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [inc, out, cols] = await Promise.all([
        fetchIncomingTransfers(accessToken),
        fetchOutgoingTransfers(accessToken),
        fetchActiveCollections(accessToken),
      ]);
      setIncoming(inc);
      setOutgoing(out);
      setCollections(cols);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Ejecuta una acción sobre una transferencia y refresca ambas listas.
  const run = async (transferId: string, action: () => Promise<unknown>) => {
    setBusyId(transferId);
    setError(null);
    try {
      await action();
      setAcceptingId(null);
      await load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const startAccept = (transferId: string) => {
    setAcceptingId(transferId);
    setCollectionId((collections.find((c) => c.isDefault) ?? collections[0])?.id ?? null);
  };

  if (incoming === null || outgoing === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-6 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const pendingOutgoing = outgoing.filter((t) => t.status === 'PENDING');
  const pastOutgoing = outgoing.filter((t) => t.status !== 'PENDING');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 60, paddingHorizontal: 20 }}
    >
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {incoming.length === 0 && outgoing.length === 0 ? (
        <EmptyState
          icon="swap-horizontal-outline"
          title="Sin transferencias"
          description='Cuando vendas un objeto a otra persona, o alguien te envíe uno, aparecerá aquí.'
        />
      ) : null}

      {incoming.length > 0 ? (
        <View className="mb-6">
          <Text className="mb-3 font-display text-lg uppercase tracking-wide text-primary">
            ¡Acabas de recibir {incoming.length === 1 ? 'un objeto' : 'objetos'}!
          </Text>
          {incoming.map((transfer) => {
            const accepting = acceptingId === transfer.id;
            const busy = busyId === transfer.id;
            return (
              <View key={transfer.id} className="mb-3 rounded-xl border border-primary bg-surface p-4">
                <View className="flex-row gap-3">
                  <Thumb photoUrl={transfer.item.photos[0]?.url} />
                  <View className="flex-1 justify-center">
                    <Text className="font-body-bold text-base text-text" numberOfLines={2}>
                      {transfer.item.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-textMuted">De {transfer.fromUser.name}</Text>
                    <Text className="mt-0.5 text-xs text-textMuted">
                      Vence en {daysLeft(transfer.expiresAt)} día(s)
                    </Text>
                  </View>
                </View>

                {accepting ? (
                  <View className="mt-4">
                    {collections.length === 0 ? (
                      <Text className="mb-3 text-sm text-danger">
                        Necesitas al menos una colección activa para recibir el objeto.
                      </Text>
                    ) : (
                      <ChipSelect
                        label="¿A qué colección lo agregas?"
                        options={collections.map((c) => ({ value: c.id, label: c.name }))}
                        value={collectionId}
                        onChange={setCollectionId}
                      />
                    )}
                    <View className="gap-3">
                      <Button
                        label="Agregar a mi colección"
                        onPress={() => collectionId && run(transfer.id, () => acceptTransfer(accessToken!, transfer.id, collectionId))}
                        loading={busy}
                        disabled={!collectionId}
                      />
                      <Button label="Volver" variant="ghost" onPress={() => setAcceptingId(null)} disabled={busy} />
                    </View>
                  </View>
                ) : (
                  <View className="mt-4 flex-row gap-3">
                    <View className="flex-1">
                      <Button label="Aceptar" onPress={() => startAccept(transfer.id)} disabled={busyId !== null} />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Rechazar"
                        variant="destructive"
                        onPress={() => run(transfer.id, () => rejectTransfer(accessToken!, transfer.id))}
                        loading={busy}
                        disabled={busyId !== null}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {pendingOutgoing.length > 0 ? (
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold text-text">Enviadas, esperando respuesta</Text>
          {pendingOutgoing.map((transfer) => (
            <View key={transfer.id} className="mb-3 rounded-xl bg-surface p-4">
              <View className="flex-row gap-3">
                <Thumb photoUrl={transfer.item.photos[0]?.url} />
                <View className="flex-1 justify-center">
                  <Text className="font-body-bold text-base text-text" numberOfLines={2}>
                    {transfer.item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-textMuted" numberOfLines={1}>
                    Para {transfer.toUser.email}
                  </Text>
                  <Text className="mt-0.5 text-xs text-textMuted">
                    Vuelve a ti en {daysLeft(transfer.expiresAt)} día(s) si no responde
                  </Text>
                </View>
              </View>
              <View className="mt-4">
                <Button
                  label="Cancelar envío"
                  variant="ghost"
                  onPress={() => run(transfer.id, () => cancelTransfer(accessToken!, transfer.id))}
                  loading={busyId === transfer.id}
                  disabled={busyId !== null}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {pastOutgoing.length > 0 ? (
        <View>
          <Text className="mb-3 text-sm font-semibold text-text">Historial de envíos</Text>
          {pastOutgoing.map((transfer) => (
            <View key={transfer.id} className="mb-2 flex-row items-center justify-between rounded-lg bg-surface px-4 py-3">
              <View className="mr-3 flex-1">
                <Text className="text-sm text-text" numberOfLines={1}>
                  {transfer.item.name}
                </Text>
                <Text className="text-xs text-textMuted" numberOfLines={1}>
                  {transfer.toUser.email}
                </Text>
              </View>
              <Text className={`text-xs ${transfer.status === 'ACCEPTED' ? 'text-primary' : 'text-textMuted'}`}>
                {STATUS_LABEL[transfer.status]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
