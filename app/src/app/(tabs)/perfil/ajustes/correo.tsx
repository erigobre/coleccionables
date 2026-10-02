import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { fetchMe, sendEmailVerification, type Me } from '../../../../lib/users';
import { colors } from '../../../../theme/tokens';

export default function EmailVerificationScreen() {
  const { accessToken } = useAuth();

  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      fetchMe(accessToken)
        .then(setMe)
        .catch((err) => setError(authErrorMessage(err)));
    }, [accessToken]),
  );

  if (!me) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const onSend = async () => {
    if (!accessToken) return;
    setError(null);
    setSending(true);
    try {
      await sendEmailVerification(accessToken);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <View className="mb-6 items-center">
        <Ionicons
          name={me.emailVerified ? 'checkmark-circle' : 'mail-unread-outline'}
          size={48}
          color={me.emailVerified ? colors.primary : colors.textMuted}
        />
        <Text className="mt-3 text-center text-base text-text">{me.email}</Text>
        <Text className="mt-1 text-sm text-textMuted">{me.emailVerified ? 'Verificado' : 'Sin verificar'}</Text>
      </View>

      {!me.emailVerified ? (
        <>
          <Text className="mb-6 text-center text-sm text-textMuted">
            Te mandamos un enlace a tu correo para confirmar que es tuyo. Ábrelo desde tu teléfono o computadora.
          </Text>
          {sent ? (
            <Text className="mb-4 text-center text-sm text-primary">Correo enviado, revisa tu bandeja de entrada.</Text>
          ) : null}
          {error ? <Text className="mb-4 text-center text-sm text-danger">{error}</Text> : null}
          <Button label={sent ? 'Reenviar correo' : 'Enviar correo de verificación'} onPress={onSend} loading={sending} />
        </>
      ) : null}
    </Screen>
  );
}
