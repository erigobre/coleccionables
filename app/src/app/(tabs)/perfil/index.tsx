import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Link } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { FtCoin } from '../../../components/ui/FtCoin';
import { Screen } from '../../../components/ui/Screen';
import { colors } from '../../../theme/tokens';
import { useAuth } from '../../../context/auth-context';
import { useFt } from '../../../context/ft-context';
import { clearLastFatalError, readLastFatalError } from '../../../lib/crash-log';
import { fetchMyReferralInfo } from '../../../lib/referrals';

function MenuRow({
  icon,
  label,
  href,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: string;
  badge?: ReactNode;
}) {
  const content = (
    <View className="flex-row items-center gap-3 border-b border-border py-4">
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text className="flex-1 text-base text-text">{label}</Text>
      {badge}
      {href ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );

  if (!href) return content;
  return (
    <Link href={href} asChild>
      <Pressable>{content}</Pressable>
    </Link>
  );
}

// Identificador de build/OTA, para diagnosticar desde el dispositivo si una
// actualización llegó o no (sin esto, no había forma de saber qué versión
// corría cada iPhone sin conectarlo a una Mac).
function buildInfoLabel() {
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '?';
  const nativeBuild = Constants.nativeBuildVersion ?? '?';
  const base = `v${appVersion} (build ${nativeBuild})`;

  if (Updates.isEmbeddedLaunch) {
    return `${base} · sin OTA aplicada`;
  }
  const shortId = Updates.updateId ? Updates.updateId.slice(0, 8) : '?';
  const date = Updates.createdAt
    ? Updates.createdAt.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : '?';
  return `${base} · OTA ${date} (${shortId}) · ${Updates.channel ?? '?'}`;
}

// Diagnóstico manual de OTA: sin esto, saber si expo-updates logra contactar
// al servidor (y por qué falla si no) exigía sacar logs del sistema del
// dispositivo (Console.app en Mac) — con este botón el resultado/error real
// se ve directo en pantalla, en cualquier iPhone.
async function checkForUpdateNow(): Promise<{ message: string; readyToApply: boolean }> {
  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) {
    return { message: 'No hay ninguna actualización disponible en este momento.', readyToApply: false };
  }
  const fetchResult = await Updates.fetchUpdateAsync();
  if (!fetchResult.isNew) {
    return { message: 'Se encontró una actualización pero no es nueva.', readyToApply: false };
  }
  return { message: 'Actualización descargada. Toca "Aplicar ahora" para reiniciar la app con ella.', readyToApply: true };
}

export default function PerfilScreen() {
  const { user, logout, accessToken } = useAuth();
  const { balance } = useFt();
  const [canInvite, setCanInvite] = useState(false);
  const [lastFatalError, setLastFatalError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const onCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const { message, readyToApply } = await checkForUpdateNow();
      Alert.alert(
        'Verificar actualización',
        message,
        readyToApply
          ? [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Aplicar ahora', onPress: () => Updates.reloadAsync().catch(() => {}) },
            ]
          : [{ text: 'Aceptar' }],
      );
    } catch (err) {
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      Alert.alert('Error al verificar actualización', detail);
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    fetchMyReferralInfo(accessToken)
      .then((info) => setCanInvite(info.canInvite))
      .catch(() => setCanInvite(false));
  }, [accessToken]);

  useEffect(() => {
    readLastFatalError().then(setLastFatalError);
  }, []);

  return (
    <Screen>
      <View className="mb-8 items-center">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-surfaceElevated">
          <Ionicons name="person" size={36} color={colors.secondary} />
        </View>
        {user?.username ? (
          <View className="flex-row items-center">
            <Text
              className="mr-0.5 font-display text-2xl text-primary"
              style={{ textShadowColor: 'rgba(198, 244, 50, 0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}
            >
              @
            </Text>
            <Text className="font-body-bold text-lg uppercase text-text">{user.username}</Text>
          </View>
        ) : (
          <Text className="font-body-bold text-lg text-text">{user?.name}</Text>
        )}
        <Text className="text-sm text-textMuted">{user?.email}</Text>
      </View>

      <View className="mb-8 rounded-lg border border-border bg-surface px-4">
        <MenuRow icon="location-outline" label="Ubicaciones" href="/(tabs)/perfil/ubicaciones" />
        <MenuRow icon="calendar-outline" label="Temporadas" href="/(tabs)/perfil/temporadas" />
        {canInvite ? (
          <MenuRow icon="people-outline" label="Invitar amigos" href="/(tabs)/perfil/invitar" />
        ) : null}
        <MenuRow
          icon="wallet-outline"
          label="FrikiTokens"
          href="/(tabs)/perfil/wallet"
          badge={
            balance != null ? (
              <View className="flex-row items-center gap-1">
                <FtCoin size={13} />
                <Text className="font-display text-sm text-primary">{balance.toLocaleString('es-MX')}</Text>
              </View>
            ) : null
          }
        />
        <MenuRow icon="settings-outline" label="Ajustes" href="/(tabs)/perfil/ajustes" />
      </View>

      <Button label="Cerrar sesión" variant="ghost" onPress={logout} />

      <Text className="mt-4 text-center text-[11px] text-textMuted">{buildInfoLabel()}</Text>

      <Pressable onPress={onCheckUpdate} disabled={checkingUpdate} className="mt-2">
        <Text className="text-center text-[11px] font-body-bold" style={{ color: colors.primary }}>
          {checkingUpdate ? 'Verificando…' : 'Verificar actualización ahora'}
        </Text>
      </Pressable>

      {lastFatalError ? (
        <Pressable
          onPress={() => {
            clearLastFatalError();
            setLastFatalError(null);
          }}
        >
          <Text className="mt-2 text-center text-[10px] text-danger" numberOfLines={4}>
            Último error capturado (toca para borrar):{'\n'}
            {lastFatalError}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
