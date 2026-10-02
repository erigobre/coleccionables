import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { TextField } from '../../../../components/ui/TextField';
import { TransferAnimation } from '../../../../components/items/TransferAnimation';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import { fetchItem, type Item } from '../../../../lib/items';
import { initiateTransfer, validateRecipientEmail } from '../../../../lib/transfers';
import { colors } from '../../../../theme/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RecipientStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export default function SellItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [email, setEmail] = useState('');
  const [recipientStatus, setRecipientStatus] = useState<RecipientStatus>('idle');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(true);
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

  // Valida estructura + TLD real y si ya existe cuenta, con debounce (mismo
  // patrón que la disponibilidad de @usuario en register.tsx) — así se
  // detectan typos de dominio (".con" en vez de ".com") y se avisa si se
  // enviará una invitación en vez de una transferencia directa.
  useEffect(() => {
    setSuggestion(null);
    if (!accessToken || !EMAIL_PATTERN.test(trimmedEmail)) {
      setRecipientStatus('idle');
      return;
    }
    let cancelled = false;
    setRecipientStatus('checking');
    const timer = setTimeout(() => {
      validateRecipientEmail(accessToken, trimmedEmail)
        .then((result) => {
          if (cancelled) return;
          setRecipientStatus(result.tldValid ? 'valid' : 'invalid');
          setSuggestion(result.suggestion);
          setHasAccount(result.hasAccount);
        })
        .catch(() => {
          if (!cancelled) setRecipientStatus('idle');
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, trimmedEmail]);

  const useSuggestion = () => {
    if (!suggestion) return;
    setEmail(suggestion);
    setSuggestion(null);
  };

  const emailValid = recipientStatus === 'valid';

  const onSend = async () => {
    if (!accessToken || !id || !emailValid) return;
    setSending(true);
    setError(null);
    try {
      const result = await initiateTransfer(accessToken, id, trimmedEmail);
      if (result.hasAccount) {
        setSent(true);
      } else {
        Alert.alert(
          'Invitación enviada',
          `Le mandamos un correo a ${trimmedEmail} para que se registre y acepte la transferencia. Tienes 7 días.`,
          [{ text: 'Entendido', onPress: () => router.back() }],
        );
      }
    } catch (err) {
      setError(authErrorMessage(err));
      setSending(false);
    }
  };

  // La animación solo corre cuando el backend ya aceptó el envío a alguien
  // que ya tiene cuenta (el caso sin cuenta usa el Alert de arriba).
  //
  // Botón de cierre manual superpuesto: la animación no se está renderizando
  // en iOS (bug sin resolver, 2026-10-01) y el swipe-down nativo del pageSheet
  // no es confiable para salir — esto garantiza una salida sin depender de
  // ninguno de los dos.
  if (sent && item) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <TransferAnimation
          photoUri={item.photos[0] ? resolvePhotoUrl(item.photos[0].url) : undefined}
          recipientLabel={trimmedEmail}
          onDone={() => router.back()}
        />
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-black/40"
          style={{ top: 56 }}
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
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
        error={recipientStatus === 'invalid' && !suggestion ? 'Ese correo no parece válido' : undefined}
      />

      {recipientStatus === 'checking' ? (
        <View className="-mt-2 mb-6 flex-row items-center">
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      ) : recipientStatus === 'invalid' && suggestion ? (
        <Text className="-mt-2 mb-6 text-xs text-danger" onPress={useSuggestion}>
          ¿Quisiste decir <Text className="font-body-bold">{suggestion}</Text>? Toca para usarlo.
        </Text>
      ) : recipientStatus === 'valid' && !hasAccount ? (
        <Text className="-mt-2 mb-6 text-xs text-textMuted">
          Esa persona todavía no tiene cuenta en Frikidex: le enviaremos un correo de invitación para que se
          registre y acepte la transferencia.
        </Text>
      ) : (
        <View className="mb-6" />
      )}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Enviar objeto" onPress={onSend} loading={sending} disabled={!emailValid} />
    </ScrollView>
  );
}
