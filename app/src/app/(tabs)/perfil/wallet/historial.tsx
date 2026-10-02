import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FtCoin } from '../../../../components/ui/FtCoin';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { fetchFtStatement, fetchFtTransactions, type FtTransaction } from '../../../../lib/ft';
import { colors } from '../../../../theme/tokens';

const SERVICE_LABELS: Record<string, string> = {
  CREATE_WITH_AI: 'Captura con IA',
  SCAN_HAVE_IT: '¿Ya lo tengo?',
  BARCODE_LOOKUP: 'Lectura de código de barras',
  MARKET_PRICE_FRESH: 'Precio de mercado',
  MARKET_PRICE_CACHED: 'Precio de mercado (en caché)',
};

function describeTransaction(tx: FtTransaction): string {
  if (tx.type === 'GRANT') return 'Regalo de FrikiTokens';
  return (tx.service && SERVICE_LABELS[tx.service]) || 'Cargo de FrikiTokens';
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

export default function StatementScreen() {
  const { accessToken } = useAuth();

  const [transactions, setTransactions] = useState<FtTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    fetchFtTransactions(accessToken, 500)
      .then(setTransactions)
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const groups = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, FtTransaction[]>();
    for (const tx of transactions) {
      const key = monthKey(tx.createdAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  if (!transactions) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const onDownload = async (month: string) => {
    if (!accessToken) return;
    setError(null);
    setDownloadingMonth(month);
    try {
      const statement = await fetchFtStatement(accessToken, month);
      const file = new File(Paths.cache, statement.filename);
      if (file.exists) file.delete();
      file.create();
      file.write(statement.base64, { encoding: 'base64' });
      await Sharing.shareAsync(file.uri, { mimeType: statement.mimeType, dialogTitle: 'Compartir estado de cuenta' });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setDownloadingMonth(null);
    }
  };

  return (
    <Screen>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {groups.length === 0 ? (
        <Text className="text-center text-sm text-textMuted">Sin movimientos todavía.</Text>
      ) : (
        groups.map(([month, txs]) => (
          <View key={month} className="mb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="font-display text-sm uppercase text-text">{monthLabel(month)}</Text>
              <Pressable
                onPress={() => onDownload(month)}
                disabled={downloadingMonth === month}
                className="flex-row items-center gap-1 py-1"
              >
                {downloadingMonth === month ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                )}
                <Text className="text-xs uppercase text-primary">CSV</Text>
              </Pressable>
            </View>
            <View className="rounded-lg border border-border bg-surface px-4">
              {txs.map((tx) => (
                <View key={tx.id} className="flex-row items-center justify-between border-b border-border py-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm text-text">{describeTransaction(tx)}</Text>
                    <Text className="text-xs text-textMuted">
                      {new Date(tx.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      {tx.user ? ` · ${tx.user.username ? `@${tx.user.username}` : tx.user.name}` : ''}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <FtCoin size={12} />
                    <Text className={`font-display text-sm ${tx.type === 'GRANT' ? 'text-primary' : 'text-text'}`}>
                      {tx.type === 'GRANT' ? '+' : '-'}
                      {tx.ftAmount}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}
