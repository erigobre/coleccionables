import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { CopyToast } from '../../../components/ui/CopyToast';
import { Screen } from '../../../components/ui/Screen';
import { useCopyFeedback } from '../../../lib/clipboard';
import { colors } from '../../../theme/tokens';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatTimestamp(ms: number) {
  return new Date(ms).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function UpdateLogsScreen() {
  const [entries, setEntries] = useState<Updates.UpdatesLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast, copy } = useCopyFeedback();

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
    `appVersion nativo: ${Application.nativeApplicationVersion ?? '?'} (build ${Application.nativeBuildVersion ?? '?'})`,
  ].join('\n');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Pressable
          onPress={() => copy(summary)}
          className="mb-5 rounded-lg border border-border bg-surface p-3"
        >
          <Text className="mb-1 font-body-bold text-xs uppercase text-textMuted">
            Estado actual (toca para copiar)
          </Text>
          <Text className="font-mono text-xs text-text">{summary}</Text>
        </Pressable>

        <Button label="Volver a leer el registro" onPress={load} loading={loading} />

        {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}

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

        {entries?.map((entry, i) => {
          const entryText = [
            formatTimestamp(entry.timestamp),
            `${entry.code} · ${entry.level}`,
            entry.message,
            entry.updateId ? `updateId: ${entry.updateId}` : null,
            entry.stacktrace?.length ? entry.stacktrace.join('\n') : null,
          ]
            .filter(Boolean)
            .join('\n');

          return (
            <Pressable
              key={`${entry.timestamp}-${i}`}
              onPress={() => copy(entryText)}
              className="mt-3 rounded-lg border border-border bg-surface p-3"
            >
              <Text className="mb-1 text-[11px] text-textMuted">{formatTimestamp(entry.timestamp)}</Text>
              <Text
                className="mb-1 font-body-bold text-xs"
                style={{ color: entry.level === 'error' || entry.level === 'fatal' ? colors.danger : colors.primary }}
              >
                {entry.code} · {entry.level}
              </Text>
              <Text className="text-xs text-text">{entry.message}</Text>
              {entry.updateId ? (
                <Text className="mt-1 text-[10px] text-textMuted">updateId: {entry.updateId}</Text>
              ) : null}
              {entry.stacktrace?.length ? (
                <Text className="mt-1 font-mono text-[10px] text-textMuted">{entry.stacktrace.join('\n')}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </Screen>

      <CopyToast message={toast} />
    </View>
  );
}
