import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { authErrorMessage } from '../../context/auth-context';
import { createItemActionRequest } from '../../lib/item-action-requests';
import type { Item, ItemActionType } from '../../lib/items';
import { colors } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { parsePrice } from './SaleModal';

const ACTION_TITLE: Record<ItemActionType, string> = {
  TRANSFER: 'Solicitar transferencia',
  SELL: 'Solicitar venta',
  DELETE: 'Solicitar eliminación',
};

const ACTION_EXPLANATION: Record<ItemActionType, string> = {
  TRANSFER: 'Como no eres el dueño real de este objeto, el dueño debe autorizar la transferencia antes de que se envíe.',
  SELL: 'Como no eres el dueño real de este objeto, el dueño debe autorizar que se ponga en venta.',
  DELETE: 'Como no eres el dueño real de este objeto, el dueño debe autorizar que se elimine.',
};

interface RequestAuthorizationModalProps {
  visible: boolean;
  action: ItemActionType;
  item: Item;
  accessToken: string;
  onClose: () => void;
  // Se mandó la solicitud: refresca el item (myPendingActionRequests) en la pantalla que lo abrió.
  onSent: () => void;
}

export function RequestAuthorizationModal({
  visible,
  action,
  item,
  accessToken,
  onClose,
  onSent,
}: RequestAuthorizationModalProps) {
  const [emailText, setEmailText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEmailText('');
    setPriceText('');
    setSending(false);
    setSent(false);
    setError(null);
  }, [visible, action]);

  const price = parsePrice(priceText);
  const canSend = action === 'TRANSFER' ? emailText.trim().length > 3 : action === 'SELL' ? price !== null : true;

  const onConfirm = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await createItemActionRequest(accessToken, item.id, {
        action,
        toEmail: action === 'TRANSFER' ? emailText.trim() : undefined,
        price: action === 'SELL' ? price ?? undefined : undefined,
      });
      onSent();
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/70">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-[420px] rounded-2xl bg-surface p-6">
            {sent ? (
              <>
                <View className="mb-3 items-center">
                  <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
                </View>
                <Text className="text-center font-display text-lg uppercase text-primary">Solicitud enviada</Text>
                <Text className="mb-5 mt-2 text-center text-sm text-textSecondary">
                  Le avisamos a {item.owner.name}. En cuanto responda, te avisamos a ti.
                </Text>
                <Button label="Listo" onPress={onClose} />
              </>
            ) : (
              <>
                <Text className="text-center font-display text-lg uppercase text-primary">{ACTION_TITLE[action]}</Text>
                <Text className="mb-4 mt-2 text-center text-sm text-textSecondary">{ACTION_EXPLANATION[action]}</Text>

                {action === 'TRANSFER' ? (
                  <TextField
                    label="Correo del destinatario"
                    value={emailText}
                    onChangeText={setEmailText}
                    keyboardType="email-address"
                    placeholder="correo@ejemplo.com"
                  />
                ) : null}

                {action === 'SELL' ? (
                  <TextField
                    label="Precio de venta (MXN)"
                    value={priceText}
                    onChangeText={setPriceText}
                    keyboardType="decimal-pad"
                    placeholder="Ej. 1500"
                    error={priceText.trim() && price === null ? 'Escribe un precio válido' : undefined}
                  />
                ) : null}

                {error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null}

                <View className="gap-3">
                  <Button label="Enviar solicitud" onPress={onConfirm} loading={sending} disabled={!canSend} />
                  <Button label="Cancelar" variant="ghost" onPress={onClose} disabled={sending} />
                </View>
              </>
            )}
          </View>
          {!sent ? (
            <Pressable
              onPress={onClose}
              accessibilityLabel="Cerrar"
              disabled={sending}
              className="mt-6 h-12 w-12 items-center justify-center rounded-full bg-surfaceElevated active:opacity-80"
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
