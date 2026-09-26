import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';
import { fetchFtPackages, type FtPackageOption } from '../../lib/ft';
import { colors } from '../../theme/tokens';
import { Button } from './Button';
import { FtCoin } from './FtCoin';

interface NoFtModalProps {
  visible: boolean;
  onClose: () => void;
}

// Se dispara cuando una acción que cobra FT tira 402 (INSUFFICIENT_FT): en vez
// de solo un texto de error, se ofrece de una vez comprar más. Los paquetes
// salen de /ft/packages — el mismo catálogo (misma BD) que alimenta la landing
// y el resto del proyecto, nunca hardcodeados aquí.
export function NoFtModal({ visible, onClose }: NoFtModalProps) {
  const [packages, setPackages] = useState<FtPackageOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchFtPackages()
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [visible]);

  // La compra real dentro de la app (StoreKit/Google Play Billing) todavía no
  // existe — Fase 10, pendiente aparte. Por ahora el botón deja clara la
  // intención y el precio, pero solo avisa que está por venir.
  const onBuy = (pkg: FtPackageOption) => {
    Alert.alert(
      'Muy pronto',
      `La compra de ${pkg.ftAmount.toLocaleString('es-MX')} FT dentro de la app estará disponible muy pronto. Mientras tanto, visita tu almacén o contáctanos en la sección de soporte.`,
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-[420px] rounded-2xl bg-surface p-6">
          <Text className="text-center font-display text-lg uppercase text-primary">¡No te quedes sin FrikiTokens!</Text>
          <Text className="mt-2 text-center text-sm text-textSecondary">
            Consíguelas aquí o visita tu almacén para obtener más.
          </Text>

          {loading ? (
            <ActivityIndicator className="mt-6" color={colors.primary} />
          ) : (
            <View className="mt-5 flex-row gap-3">
              {packages.map((pkg) => (
                <View
                  key={pkg.code}
                  className="flex-1 items-center rounded-xl border border-border bg-surfaceElevated px-3 py-4"
                >
                  <View className="flex-row items-center gap-1.5">
                    <FtCoin size={18} />
                    <Text className="font-display text-xl text-primary">{pkg.ftAmount.toLocaleString('es-MX')}</Text>
                  </View>
                  <Text className="mt-0.5 text-[11px] uppercase tracking-wide text-textMuted">FrikiTokens</Text>
                  {pkg.badge ? (
                    <View className="mt-2 rounded-full bg-secondary px-2 py-0.5">
                      <Text className="text-[10px] font-medium uppercase text-white">{pkg.badge}</Text>
                    </View>
                  ) : null}
                  <View className="mt-3 w-full">
                    <Button
                      label={`$${(pkg.priceMxnCents / 100).toLocaleString('es-MX')}`}
                      onPress={() => onBuy(pkg)}
                      variant="primary"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Pressable
          onPress={onClose}
          accessibilityLabel="Cerrar"
          className="mt-6 h-12 w-12 items-center justify-center rounded-full bg-surfaceElevated active:opacity-80"
        >
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>
    </Modal>
  );
}
