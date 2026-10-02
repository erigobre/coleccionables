import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { FtCoin } from '../../../../components/ui/FtCoin';
import { NoFtModal } from '../../../../components/ui/NoFtModal';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { fetchFtBalance, type FtBalance } from '../../../../lib/ft';
import { fetchOrganizationInfo, type OrganizationInfo } from '../../../../lib/organizations';
import { colors } from '../../../../theme/tokens';

function WalletRow({ label, amount, dimmed }: { label: string; amount: number; dimmed?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between rounded-lg border border-border px-4 py-3 ${
        dimmed ? 'bg-background' : 'bg-surface'
      }`}
    >
      <Text className={`text-sm ${dimmed ? 'text-textMuted' : 'text-text'}`}>{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <FtCoin size={14} />
        <Text className={`font-display text-base ${dimmed ? 'text-textMuted' : 'text-primary'}`}>
          {amount.toLocaleString('es-MX')}
        </Text>
      </View>
    </View>
  );
}

function MenuRow({ icon, label, href, badge }: { icon: keyof typeof Ionicons.glyphMap; label: string; href: string; badge?: number }) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border py-4">
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <Text className="flex-1 text-base text-text">{label}</Text>
        {badge ? (
          <View className="min-w-[22px] items-center rounded-full bg-primary px-1.5 py-0.5">
            <Text className="font-display text-[11px] text-primaryText">{badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </Link>
  );
}

export default function WalletScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [balance, setBalance] = useState<FtBalance | null>(null);
  const [org, setOrg] = useState<OrganizationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([fetchFtBalance(accessToken), fetchOrganizationInfo(accessToken)])
      .then(([b, o]) => {
        setBalance(b);
        setOrg(o);
      })
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!balance || !org) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const hasActivePlan = !!org.activeFtPlan;

  return (
    <Screen>
      <View className="mb-6 items-center">
        <View className="flex-row items-center gap-2">
          <FtCoin size={22} />
          <Text className="font-display text-3xl text-primary">{balance.balance.toLocaleString('es-MX')}</Text>
        </View>
        <Text className="text-sm text-textMuted">FrikiTokens disponibles</Text>
      </View>

      {error ? <Text className="mb-4 text-center text-sm text-danger">{error}</Text> : null}

      <View className="mb-6 gap-3">
        <WalletRow label="Gratis" amount={balance.free} />
        <WalletRow label="Suscripción familiar" amount={balance.subscription} dimmed={!hasActivePlan} />
        <WalletRow label="Comprados" amount={balance.purchased} />
      </View>

      <View className="mb-8 flex-row gap-3">
        <View className="flex-1">
          <Button label="Comprar" variant="secondary" onPress={() => setShowBuy(true)} />
        </View>
        <View className="flex-1">
          <Button label="Suscripción" onPress={() => router.push('/(tabs)/perfil/wallet/suscripcion')} />
        </View>
      </View>

      <View className="rounded-lg border border-border bg-surface px-4">
        <MenuRow icon="receipt-outline" label="Historial y estado de cuenta" href="/(tabs)/perfil/wallet/historial" />
        <MenuRow icon="mail-open-outline" label="Invitaciones recibidas" href="/(tabs)/perfil/wallet/invitaciones" />
        {org.myRole === 'OWNER' ? (
          <MenuRow icon="people-outline" label="Familiares" href="/(tabs)/perfil/wallet/familiares" />
        ) : null}
      </View>

      <NoFtModal visible={showBuy} onClose={() => setShowBuy(false)} />
    </Screen>
  );
}
