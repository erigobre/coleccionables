import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { TextField } from '../../../../components/ui/TextField';
import { TransferAnimation } from '../../../../components/items/TransferAnimation';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import { fetchItem, type Item } from '../../../../lib/items';
import { initiateTransfer } from '../../../../lib/transfers';
import { colors } from '../../../../theme/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SellItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) return;
    fetchItem(accessToken, id)
      .then(setItem)
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken, id]);

  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_PATTERN.test(trimmedEmail);

  const onSend = async () => {
    if (!accessToken || !id || !emailValid) return;
    setSending(true);
    setError(null);
    try {
      await initiateTransfer(accessToken, id, trimmedEmail);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
      setSending(false);
    }
  };

  // La animación solo corre cuando el backend ya aceptó el envío.
  if (sent && item) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <TransferAnimation
          photoUri={item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined}
          recipientLabel={trimmedEmail}
          onDone={() => router.back()}
        />
      </>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-6 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 60, paddingHorizontal: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="font-body-bold mb-1 text-lg text-text">{item.name}</Text>
      <Text className="mb-6 text-sm text-textMuted">
        La otra persona recibirá una solicitud y elegirá a qué colección suya lo agrega. Mientras responde, el objeto
        queda "En transferencia" y no se puede editar. Si no responde en 7 días, vuelve a ti.
      </Text>

      <TextField
        label="Correo de quien lo recibirá"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="correo@ejemplo.com"
        error={email.length > 0 && !emailValid ? 'Escribe un correo válido' : undefined}
      />
      <Text className="-mt-2 mb-6 text-xs text-textMuted">Debe tener una cuenta en Frikidex.</Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Enviar objeto" onPress={onSend} loading={sending} disabled={!emailValid} />
    </ScrollView>
  );
}
