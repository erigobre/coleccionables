import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { FtCoin } from '../../../../components/ui/FtCoin';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { finishPurchase, initIapConnection, purchasePackage, storeToPlatform } from '../../../../lib/iap';
import { fetchIapCatalog, verifyPackagePurchase, type IapCatalogPackage } from '../../../../lib/iap-server';
import { colors } from '../../../../theme/tokens';

export default function BuyFtScreen() {
  const { accessToken } = useAuth();

  const [packages, setPackages] = useState<IapCatalogPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyingCode, setBuyingCode] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    fetchIapCatalog(accessToken)
      .then((r) => setPackages([...r.packages].sort((a, b) => b.ftAmount - a.ftAmount)))
      .catch((err) => setError(authErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const buy = async (pkg: IapCatalogPackage) => {
    if (!accessToken) return;
    const sku = Platform.OS === 'ios' ? pkg.storeProductIdIos : pkg.storeProductIdAndroid;
    if (!sku) {
      Alert.alert('No disponible', 'Este paquete no está configurado para tu tienda todavía.');
      return;
    }
    setError(null);
    setBuyingCode(pkg.code);
    try {
      await initIapConnection();
      const purchase = await purchasePackage(sku);
      const platform = storeToPlatform(purchase.store);
      const result = await verifyPackagePurchase(accessToken, {
        platform,
        ftPackageCode: pkg.code,
        iosTransactionJws: platform === 'IOS' ? purchase.purchaseToken ?? undefined : undefined,
        androidPurchaseToken: platform === 'ANDROID' ? purchase.purchaseToken ?? undefined : undefined,
        androidProductId: platform === 'ANDROID' ? purchase.productId : undefined,
      });
      if (result.success) {
        await finishPurchase(purchase, true);
        Alert.alert('¡Listo!', `Se agregaron ${pkg.ftAmount.toLocaleString('es-MX')} FT a tu cuenta.`);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBuyingCode(null);
    }
  };

  const onPressPackage = (pkg: IapCatalogPackage) => {
    Alert.alert(
      `¿Comprar ${pkg.ftAmount.toLocaleString('es-MX')} FT?`,
      `Se te cobrará $${(pkg.priceMxnCents / 100).toLocaleString('es-MX')} MXN a través de tu cuenta de ${
        Platform.OS === 'ios' ? 'Apple' : 'Google Play'
      }.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Comprar', onPress: () => buy(pkg) },
      ],
    );
  };

  if (loading && !packages.length) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return (
    <Screen>
      <Text className="mb-1 font-display text-lg uppercase text-text">Comprar FrikiTokens</Text>
      <Text className="mb-6 text-sm text-textMuted">
        Elige un paquete. Se agregan a tu monedero de FT comprados en cuanto se confirme el pago.
      </Text>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="gap-3">
        {packages.map((pkg) => (
          <View
            key={pkg.code}
            className="flex-row items-center justify-between rounded-xl border border-border bg-surfaceElevated p-4"
          >
            <View className="flex-row items-center gap-2">
              <FtCoin size={24} />
              <View>
                <Text className="font-display text-xl text-primary">{pkg.ftAmount.toLocaleString('es-MX')}</Text>
                <Text className="text-[11px] uppercase tracking-wide text-textMuted">FrikiTokens</Text>
              </View>
            </View>
            <View className="w-32">
              <Button
                label={`$${(pkg.priceMxnCents / 100).toLocaleString('es-MX')}`}
                onPress={() => onPressPackage(pkg)}
                variant="primary"
                loading={buyingCode === pkg.code}
                disabled={buyingCode !== null}
              />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
