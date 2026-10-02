import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { FtCoin } from '../../../../components/ui/FtCoin';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { fetchFtPlans, type FtPlanOption } from '../../../../lib/ft';
import { cancelSubscription, fetchOrganizationInfo, type OrganizationInfo } from '../../../../lib/organizations';
import { colors } from '../../../../theme/tokens';

const BENEFITS = [
  'Un monedero de FrikiTokens compartido con tu familia, que se recarga cada mes.',
  'Invita hasta a varios familiares según tu plan: cada uno conserva sus propios objetos y colecciones.',
  'Tus FrikiTokens gratis y comprados siguen siendo solo tuyos; el monedero de suscripción es aparte.',
];

export default function SubscriptionScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [org, setOrg] = useState<OrganizationInfo | null>(null);
  const [plans, setPlans] = useState<FtPlanOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    Promise.all([fetchOrganizationInfo(accessToken), fetchFtPlans()])
      .then(([o, p]) => {
        setOrg(o);
        setPlans(p);
      })
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSubscribe = (plan: FtPlanOption) => {
    Alert.alert(
      'Muy pronto',
      `Suscribirte al plan ${plan.label} dentro de la app estará disponible muy pronto. Mientras tanto contáctanos en la sección de soporte.`,
    );
  };

  const onCancel = () => {
    Alert.alert(
      '¿Cancelar suscripción?',
      'El monedero compartido quedará en 0 de inmediato y tus familiares perderán acceso a él. El saldo gratis y comprado de cada persona no se ve afectado.',
      [
        { text: 'No cancelar', style: 'cancel' },
        {
          text: 'Cancelar suscripción',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            setError(null);
            setCanceling(true);
            try {
              await cancelSubscription(accessToken);
              load();
            } catch (err) {
              setError(authErrorMessage(err));
            } finally {
              setCanceling(false);
            }
          },
        },
      ],
    );
  };

  if (!org) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return (
    <Screen>
      <Text className="mb-1 font-display text-lg uppercase text-text">Suscripción familiar</Text>
      <Text className="mb-6 text-sm text-textMuted">
        Un plan mensual con un monedero de FrikiTokens que se comparte entre tú y las personas que invites.
      </Text>

      <View className="mb-6 gap-2">
        {BENEFITS.map((text) => (
          <View key={text} className="flex-row items-start gap-2">
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-sm text-textSecondary">{text}</Text>
          </View>
        ))}
      </View>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      {org.activeFtPlan ? (
        <View className="mb-6 rounded-lg border border-primary bg-surface p-4">
          <Text className="font-display text-base uppercase text-primary">Plan activo: {org.activeFtPlan.label}</Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <FtCoin size={14} />
            <Text className="text-sm text-textSecondary">
              {org.activeFtPlan.ftAmountMonthly.toLocaleString('es-MX')} FT al mes, compartidos
            </Text>
          </View>
          <Text className="mt-1 text-sm text-textMuted">Hasta {org.activeFtPlan.maxInvitedMembers} familiares invitados</Text>
          <View className="mt-4">
            <Button label="Cancelar suscripción" variant="destructive" onPress={onCancel} loading={canceling} />
          </View>
        </View>
      ) : (
        <View className="mb-6 gap-3">
          {plans.map((plan) => (
            <View key={plan.code} className="rounded-lg border border-border bg-surface p-4">
              <Text className="font-display text-base uppercase text-text">{plan.label}</Text>
              <View className="mt-1 flex-row items-center gap-1.5">
                <FtCoin size={14} />
                <Text className="text-sm text-textSecondary">{plan.ftAmountMonthly.toLocaleString('es-MX')} FT al mes</Text>
              </View>
              <Text className="mt-1 text-sm text-textMuted">Hasta {plan.maxInvitedMembers} familiares invitados</Text>
              <View className="mt-4">
                <Button
                  label={`Suscribirme — $${(plan.monthlyPriceMxnCents / 100).toLocaleString('es-MX')}/mes`}
                  onPress={() => onSubscribe(plan)}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {org.myRole === 'OWNER' ? (
        <Button
          label="Ver familiares"
          variant="ghost"
          onPress={() => router.push('/(tabs)/perfil/wallet/familiares')}
        />
      ) : null}
    </Screen>
  );
}
