import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage } from '../../context/auth-context';
import { forgotPasswordRequest } from '../../lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      router.push({ pathname: '/(auth)/restablecer-contrasena', params: { email: email.trim() } });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="mb-10 mt-16">
        <Text className="font-display text-[28px] uppercase tracking-wide text-text">Recupera tu contraseña</Text>
        <Text className="mt-1 text-sm text-textMuted">
          Escribe tu correo y te mandamos un código para poner una contraseña nueva.
        </Text>
      </View>

      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
      />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Mandar código" onPress={onSubmit} loading={loading} disabled={!email} />
    </Screen>
  );
}
