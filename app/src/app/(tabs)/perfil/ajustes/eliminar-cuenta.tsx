import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { deleteAccount } from '../../../../lib/users';

export default function DeleteAccountScreen() {
  const { accessToken, logout } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    if (!accessToken) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount(accessToken);
      await logout();
    } catch (err) {
      setError(authErrorMessage(err));
      setDeleting(false);
    }
  };

  const onPress = () => {
    Alert.alert('¿Eliminar tu cuenta?', 'Esta acción empieza de inmediato y no se puede deshacer desde la app.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar cuenta', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <Screen>
      <View className="gap-4">
        <Text className="font-display text-lg uppercase text-text">Eliminar tu cuenta</Text>
        <Text className="text-sm text-textMuted">
          Al eliminar tu cuenta, dejará de funcionar de inmediato: no podrás iniciar sesión de forma normal, nadie
          podrá encontrarte por tu @usuario o correo para invitarte a colecciones compartidas, familias de
          FrikiTokens, ni para transferirte objetos.
        </Text>
        <Text className="text-sm text-textMuted">
          Tienes 15 días para cambiar de opinión: si inicias sesión de nuevo con tu correo y contraseña dentro de
          ese plazo, tu cuenta se reactiva sola, exactamente como estaba.
        </Text>
        <Text className="text-sm text-textMuted">
          Si no vuelves a iniciar sesión en esos 15 días, tu cuenta se elimina de forma permanente: tu nombre,
          @usuario, correo, foto y contraseña se borran y no se pueden recuperar. Los objetos que ya le hayas
          transferido a otras personas no se ven afectados.
        </Text>

        {error ? <Text className="text-sm text-danger">{error}</Text> : null}

        <Button label="Eliminar cuenta" variant="destructive" onPress={onPress} loading={deleting} />
      </View>
    </Screen>
  );
}
