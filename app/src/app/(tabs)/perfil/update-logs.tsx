import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Screen } from '../../../components/ui/Screen';
import { colors } from '../../../theme/tokens';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatTimestamp(ms: number) {
  return new Date(ms).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function UpdateLogsScreen() {
  const [entries, setEntries] = useState<Updates.UpdatesLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await Updates.readLogEntriesAsync(SEVEN_DAYS_MS);
      setEntries([...result].sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      setError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = [
    `isEmbeddedLaunch: ${String(Updates.isEmbeddedLaunch)}`,
    `updateId: ${Updates.updateId ?? '(ninguno)'}`,
    `channel: ${Updates.channel ?? '(ninguno)'}`,
    `runtimeVersion: ${Updates.runtimeVersion ?? '(ninguno)'}`,
    `createdAt: ${Updates.createdAt ? Updates.createdAt.toISOString() : '(ninguno)'}`,
    `appVersion nativo: ${Constants.nativeAppVersion ?? '?'} (build ${Constants.nativeBuildVersion ?? '?'})`,
  ].join('\n');

  return (
    <Screen>
      <View className="mb-5 rounded-lg border border-border bg-surface p-3">
        <Text className="mb-1 font-body-bold text-xs uppercase text-textMuted">Estado actual</Text>
        <Text className="font-mono text-xs text-text" selectable>
          {summary}
        </Text>
      </View>

      <Button label="Volver a leer el registro" onPress={load} loading={loading} />

      {error ? <Text className="mt-4 text-sm text-danger" selectable>{error}</Text> : null}

      {loading && !entries ? (
        <View className="mt-8 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}

      {entries && entries.length === 0 ? (
        <Text className="mt-6 text-center text-sm text-textMuted">
          expo-updates no registró ninguna entrada en los últimos 7 días.
        </Text>
      ) : null}

      {entries?.map((entry, i) => (
        <View key={`${entry.timestamp}-${i}`} className="mt-3 rounded-lg border border-border bg-surface p-3">
          <Text className="mb-1 text-[11px] text-textMuted">{formatTimestamp(entry.timestamp)}</Text>
          <Text
            className="mb-1 font-body-bold text-xs"
            style={{ color: entry.level === 'error' || entry.level === 'fatal' ? colors.danger : colors.primary }}
          >
            {entry.code} · {entry.level}
          </Text>
          <Text className="text-xs text-text" selectable>
            {entry.message}
          </Text>
          {entry.updateId ? (
            <Text className="mt-1 text-[10px] text-textMuted" selectable>
              updateId: {entry.updateId}
            </Text>
          ) : null}
          {entry.stacktrace?.length ? (
            <Text className="mt-1 font-mono text-[10px] text-textMuted" selectable>
              {entry.stacktrace.join('\n')}
            </Text>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}
