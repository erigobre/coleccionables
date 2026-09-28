import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { authErrorMessage } from '../../context/auth-context';
import { clearItemSale, setItemSale, type Item, type SaleStatus } from '../../lib/items';
import { colors } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

// ask: ¿poner en venta? · activated: confirmación tras activar · manage: botón "$"
// · sold: invitación a transferir tras marcarlo vendido.
type Step = 'ask' | 'activated' | 'manage' | 'sold';

const STATUS_LABEL: Record<SaleStatus, string> = {
  FOR_SALE: 'En venta',
  RESERVED: 'Apartado',
  SOLD: 'Vendido',
};

interface SaleModalProps {
  visible: boolean;
  item: Item;
  accessToken: string;
  // true si el usuario NO ha consultado el precio de mercado en los últimos 7 días.
  suggestMarketPrice: boolean;
  marketPriceFtCost?: number | null;
  onClose: () => void;
  // El objeto cambió en el backend: la pantalla debe recargarlo.
  onChanged: () => void;
  onLookupMarketPrice: () => void;
  onTransfer: () => void;
}

export function parsePrice(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
}

export function formatSalePrice(item: Pick<Item, 'salePrice' | 'currency'>): string | null {
  if (item.salePrice === null) return null;
  return `$${Number(item.salePrice).toLocaleString('es-MX', { maximumFractionDigits: 2 })} ${item.currency}`;
}

// Modal (misma identidad que el de FrikiTokens) del flujo "Objeto en venta".
export function SaleModal({
  visible,
  item,
  accessToken,
  suggestMarketPrice,
  marketPriceFtCost,
  onClose,
  onChanged,
  onLookupMarketPrice,
  onTransfer,
}: SaleModalProps) {
  const [step, setStep] = useState<Step>('ask');
  const [priceText, setPriceText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre: si ya está en venta se administra, si no se pregunta.
  useEffect(() => {
    if (!visible) return;
    setStep(item.saleStatus ? 'manage' : 'ask');
    setPriceText(item.salePrice !== null ? String(Number(item.salePrice)) : '');
    setError(null);
    setBusy(null);
    // Solo al abrir: los cambios de `item` a mitad del flujo no deben reiniciarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const price = parsePrice(priceText);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const applyStatus = (key: string, status: SaleStatus, next: Step | null) => {
    if (status !== 'SOLD' && price === null) {
      setError('Escribe un precio válido, mayor a 0.');
      return;
    }
    return run(key, async () => {
      await setItemSale(accessToken, item.id, { status, price: price ?? undefined });
      onChanged();
      if (next) setStep(next);
      else onClose();
    });
  };

  const deactivate = () =>
    run('clear', async () => {
      await clearItemSale(accessToken, item.id);
      onChanged();
      onClose();
    });

  const priceField = (
    <TextField
      label="Precio de venta (MXN)"
      value={priceText}
      onChangeText={setPriceText}
      keyboardType="decimal-pad"
      placeholder="Ej. 1500"
      error={priceText.trim() && price === null ? 'Escribe un precio válido' : undefined}
    />
  );

  const errorText = error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null;

  let content: React.ReactNode;

  if (step === 'ask') {
    content = (
      <>
        <Text className="text-center font-display text-lg uppercase text-primary">
          ¿Te gustaría poner este objeto en venta?
        </Text>
        <Text className="mb-4 mt-2 text-center text-sm text-textSecondary">
          Coloca el precio que te gustaría asignarle a este objeto.
        </Text>
        {priceField}
        {errorText}
        <View className="gap-3">
          <Button
            label="Activar venta"
            onPress={() => applyStatus('activate', 'FOR_SALE', 'activated')}
            loading={busy === 'activate'}
            disabled={price === null}
          />
          <Button label="Cancelar" variant="ghost" onPress={onClose} disabled={busy !== null} />
        </View>
      </>
    );
  } else if (step === 'activated') {
    content = (
      <>
        <View className="mb-3 items-center">
          <Ionicons name="pricetag" size={36} color={colors.primary} />
        </View>
        <Text className="text-center font-display text-lg uppercase text-primary">¡Objeto en venta!</Text>
        <Text className="mb-5 mt-2 text-center text-sm text-textSecondary">
          Tu objeto quedó marcado como &ldquo;en venta&rdquo; por {formatSalePrice({ salePrice: String(price ?? 0), currency: item.currency })}.
          Ya aparece en tu colección &ldquo;En Venta&rdquo;.
        </Text>
        {suggestMarketPrice ? (
          <View className="border-t border-border pt-5">
            <Text className="text-center font-display text-lg uppercase text-primary">Sugerencia</Text>
            <Text className="mt-2 text-center text-sm text-textSecondary">
              No has consultado su precio actual de mercado.
            </Text>
            <Text className="mb-4 mt-2 text-center text-sm font-bold text-text">
              ¿Quieres verlo ahora para asegurarte de ponerle un buen precio?
            </Text>
            <View className="gap-3">
              <Button
                label="Sí"
                ftCost={marketPriceFtCost}
                onPress={() => {
                  onClose();
                  onLookupMarketPrice();
                }}
              />
              <Button label="Ahora no" variant="ghost" onPress={onClose} />
            </View>
          </View>
        ) : (
          <Button label="Listo" onPress={onClose} />
        )}
      </>
    );
  } else if (step === 'sold') {
    content = (
      <>
        <View className="mb-3 items-center">
          <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
        </View>
        <Text className="text-center font-display text-lg uppercase text-primary">¡Felicidades por la venta!</Text>
        <Text className="mb-5 mt-2 text-center text-sm text-textSecondary">
          Tu objeto quedó marcado como vendido. ¿Quieres transferírselo ahora a su nuevo dueño en Frikidex?
        </Text>
        <View className="gap-3">
          <Button
            label="Transferir al nuevo dueño"
            onPress={() => {
              onClose();
              onTransfer();
            }}
          />
          <Button label="Más tarde" variant="ghost" onPress={onClose} />
        </View>
      </>
    );
  } else {
    const status = item.saleStatus;
    const isSold = status === 'SOLD';
    content = (
      <>
        <Text className="text-center font-display text-lg uppercase text-primary">Venta del objeto</Text>
        {status ? (
          <View className="mt-2 items-center">
            <View className="rounded-full bg-secondary px-3 py-1">
              <Text className="text-xs font-medium uppercase text-white">{STATUS_LABEL[status]}</Text>
            </View>
          </View>
        ) : null}
        <View className="mt-4">{priceField}</View>
        {errorText}
        <View className="gap-3">
          {isSold ? (
            <>
              <Button
                label="Transferir al nuevo dueño"
                onPress={() => {
                  onClose();
                  onTransfer();
                }}
                disabled={busy !== null}
              />
              <Button
                label="Volver a ponerlo en venta"
                variant="ghost"
                onPress={() => applyStatus('resell', 'FOR_SALE', null)}
                loading={busy === 'resell'}
                disabled={price === null}
              />
            </>
          ) : (
            <>
              <Button
                label="Guardar precio"
                onPress={() => applyStatus('save', status ?? 'FOR_SALE', null)}
                loading={busy === 'save'}
                disabled={price === null || busy !== null}
              />
              <Button
                label={status === 'RESERVED' ? 'Volver a en venta' : 'Marcar como apartado'}
                variant="secondary"
                onPress={() => applyStatus('toggle', status === 'RESERVED' ? 'FOR_SALE' : 'RESERVED', null)}
                loading={busy === 'toggle'}
                disabled={price === null || busy !== null}
              />
              <Button
                label="Marcar como vendido"
                variant="secondary"
                onPress={() => applyStatus('sold', 'SOLD', 'sold')}
                loading={busy === 'sold'}
                disabled={busy !== null}
              />
            </>
          )}
          <Button
            label="Quitar de la venta"
            variant="ghost"
            onPress={deactivate}
            loading={busy === 'clear'}
            disabled={busy !== null}
          />
        </View>
      </>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/70"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-full max-w-[420px] rounded-2xl bg-surface p-6">{content}</View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Cerrar"
            disabled={busy !== null}
            className="mt-6 h-12 w-12 items-center justify-center rounded-full bg-surfaceElevated active:opacity-80"
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
