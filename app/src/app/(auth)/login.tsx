import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../context/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="mb-10 mt-16">
        <Text className="text-2xl font-bold text-text">Bienvenido de vuelta</Text>
        <Text className="mt-1 text-sm text-textMuted">Inicia sesión para ver tu colección</Text>
      </View>

      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="••••••••"
      />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Iniciar sesión" onPress={onSubmit} loading={loading} disabled={!email || !password} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-textMuted">¿No tienes cuenta? </Text>
        <Link href="/(auth)/register" className="text-sm font-semibold text-primary">
          Regístrate
        </Link>
      </View>
    </Screen>
  );
}
