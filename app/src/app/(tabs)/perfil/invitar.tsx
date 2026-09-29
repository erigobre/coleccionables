import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Share, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { colors } from '../../../theme/tokens';
import { authErrorMessage, useAuth } from '../../../context/auth-context';
import { fetchMyReferralInfo, redeemReferralCode, type ReferralInfo } from '../../../lib/referrals';

export default function InvitarAmigosScreen() {
  const { accessToken } = useAuth();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setInfo(await fetchMyReferralInfo(accessToken));
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onShare = () => {
    if (!info) return;
    Share.share({
      message: `Únete a Frikidex y organiza tu colección. Usa mi código ${info.code} al registrarte y ambos recibimos FrikiTokens de regalo.`,
    });
  };

  const onRedeem = async () => {
    if (!accessToken || redeemCode.trim().length === 0) return;
    setError(null);
    setRedeeming(true);
    try {
      const result = await redeemReferralCode(accessToken, redeemCode.trim());
      setRedeemCode('');
      await load();
      Alert.alert('¡Listo!', `Canjeaste el código de ${result.inviterName}. Ya recibiste tu bono de bienvenida.`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setRedeeming(false);
    }
  };

  if (info === null) {
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

  if (!info.featureEnabled) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-sm text-textMuted">
          El programa de invitaciones no está disponible por ahora.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-5 pt-4">
      <Text className="mb-6 text-sm text-textMuted">
        Comparte tu código con tus amigos. Cuando alguien lo canjee al registrarse, ambos reciben FrikiTokens de
        regalo.
      </Text>

      <View className="mb-6 items-center rounded-lg border border-border bg-surface py-8">
        <Text className="mb-2 text-xs uppercase tracking-wide text-textMuted">Tu código</Text>
        <Text className="font-display text-3xl tracking-widest text-primary">{info.code}</Text>
      </View>

      <Button label="Compartir mi código" onPress={onShare} />

      <Text className="mb-6 mt-4 text-center text-xs text-textMuted">
        {info.successfulThisMonth} de {info.limit} invitaciones exitosas este mes
      </Text>

      {!info.alreadyReferred ? (
        <View className="rounded-lg border border-border bg-surface p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="gift-outline" size={16} color={colors.textMuted} />
            <Text className="text-sm font-medium text-text">¿Alguien te compartió un código?</Text>
          </View>
          <TextField
            label="Código de invitación"
            value={redeemCode}
            onChangeText={(text) => setRedeemCode(text.toUpperCase())}
            placeholder="ABCD1234"
            autoCapitalize="characters"
          />
          {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
          <Button label="Canjear código" onPress={onRedeem} loading={redeeming} disabled={redeemCode.trim().length === 0} />
        </View>
      ) : null}
    </View>
  );
}
