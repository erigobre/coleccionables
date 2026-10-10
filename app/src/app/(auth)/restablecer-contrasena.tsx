import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../context/auth-context';
import { resetPasswordRequest } from '../../lib/api';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { applyTokens } = useAuth();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === newPasswordConfirm;
  const canSubmit = code.length === 6 && newPassword.length >= 8 && passwordsMatch;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await resetPasswordRequest({ token: code.trim(), newPassword });
      await applyTokens(tokens);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="mb-10 mt-16">
        <Text className="font-display text-[28px] uppercase tracking-wide text-text">Pon tu código</Text>
        <Text className="mt-1 text-sm text-textMuted">
          {email ? `Te mandamos un código a ${email}. ` : 'Te mandamos un código a tu correo. '}
          Vence en 30 minutos.
        </Text>
      </View>

      <TextField
        label="Código de 6 dígitos"
        value={code}
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        placeholder="000000"
        maxLength={6}
      />
      <TextField
        label="Contraseña nueva"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoComplete="password-new"
        placeholder="Mínimo 8 caracteres"
      />
      <TextField
        label="Repite la contraseña nueva"
        value={newPasswordConfirm}
        onChangeText={setNewPasswordConfirm}
        secureTextEntry
        autoComplete="password-new"
        placeholder="Mínimo 8 caracteres"
        error={newPasswordConfirm.length > 0 && !passwordsMatch ? 'Las contraseñas no coinciden' : undefined}
      />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Cambiar contraseña" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
    </Screen>
  );
}
