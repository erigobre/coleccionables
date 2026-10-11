import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, Text, View } from 'react-native';
import { CopyToast } from '../../../../components/ui/CopyToast';
import { Screen } from '../../../../components/ui/Screen';
import { useAuth } from '../../../../context/auth-context';
import { API_BASE_URL } from '../../../../lib/api';
import { checkForAppUpdate, formatBuildInfoLine, getBuildInfo, openStoreForUpdate } from '../../../../lib/app-version';
import { useCopyFeedback } from '../../../../lib/clipboard';
import { colors } from '../../../../theme/tokens';

function MenuRow({
  icon,
  label,
  onPress,
  href,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  href?: string;
}) {
  const content = (
    <View className="flex-row items-center gap-3 border-b border-border py-4">
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text className="flex-1 text-base text-text">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export default function InfoScreen() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const { toast, copy } = useCopyFeedback();

  const buildInfo = getBuildInfo();
  const isSuperadmin = user?.role === 'SUPERADMIN';

  const onCheckUpdate = async () => {
    setChecking(true);
    try {
      const result = await checkForAppUpdate();
      if (result.kind === 'native-update') {
        Alert.alert(
          'Nueva versión disponible',
          `Hay una versión más reciente de Frikidex (build ${result.latestBuildNumber}) en TestFlight. ¿Quieres abrirlo para actualizar?`,
          [
            { text: 'Más tarde', style: 'cancel' },
            { text: 'Actualizar', onPress: () => openStoreForUpdate() },
          ],
        );
      } else if (result.kind === 'ota-update') {
        Alert.alert('Actualización descargada', result.message, [{ text: 'Aceptar' }]);
      } else {
        Alert.alert('Todo al día', 'Ya tienes la versión más reciente de Frikidex.', [{ text: 'Aceptar' }]);
      }
    } catch (err) {
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      Alert.alert('Error al verificar actualización', detail);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View className="mb-8 items-center">
          <Image source={require('../../../../../assets/icon.png')} style={{ width: 72, height: 72, borderRadius: 16 }} />
          <Text className="mt-3 font-display text-xl text-text">Frikidex</Text>
          <Pressable onPress={() => copy(formatBuildInfoLine(buildInfo))}>
            <Text className="mt-1 text-center text-[11px] text-textMuted">{formatBuildInfoLine(buildInfo)}</Text>
          </Pressable>
        </View>

        <View className="mb-8 rounded-lg border border-border bg-surface px-4">
          <Pressable
            onPress={onCheckUpdate}
            disabled={checking}
            className="flex-row items-center gap-3 border-b border-border py-4"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
            <Text className="flex-1 text-base text-text">{checking ? 'Verificando…' : 'Buscar actualizaciones'}</Text>
            {checking ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </Pressable>
          <MenuRow icon="shield-checkmark-outline" label="Política de privacidad" onPress={() => Linking.openURL(`${API_BASE_URL}/privacidad`)} />
          <MenuRow icon="document-text-outline" label="Términos de uso" onPress={() => Linking.openURL(`${API_BASE_URL}/terminos`)} />
          <MenuRow icon="code-slash-outline" label="Licencias de uso" href="/(tabs)/perfil/info/licencias" />
          {isSuperadmin ? (
            <MenuRow icon="bug-outline" label="Diagnóstico de OTA (superadmin)" href="/(tabs)/perfil/update-logs" />
          ) : null}
        </View>

        <Text className="px-4 text-center text-[11px] text-textMuted">
          Frikidex es una app para catalogar colecciones personales. Para dudas sobre tus datos o esta app, consulta la
          política de privacidad y los términos de uso de arriba.
        </Text>
      </Screen>

      <CopyToast message={toast} />
    </View>
  );
}
