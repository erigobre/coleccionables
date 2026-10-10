import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../context/auth-context';
import { colors } from '../../theme/tokens';

export default function LoginScreen() {
  const { login, lastIdentity, forgetIdentity } = useAuth();
  // `lastIdentity` solo sobrevive cuando la app se reinstaló de verdad (ver
  // auth-storage.ts): un logout manual lo borra, así que ese caso siempre cae
  // en el formulario en blanco de abajo.
  const [useDifferentAccount, setUseDifferentAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returning = !!lastIdentity && !useDifferentAccount;
  const loginEmail = returning ? lastIdentity.email : email;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(loginEmail.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onUseDifferentAccount = async () => {
    await forgetIdentity();
    setUseDifferentAccount(true);
    setPassword('');
    setError(null);
  };

  return (
    <Screen>
      <View className="mb-10 mt-16">
        {returning ? (
          <>
            <Text className="font-display text-[28px] uppercase tracking-wide text-text">
              Hola de nuevo, {lastIdentity.name}
            </Text>
            <Text className="mt-1 text-sm text-textMuted">Inicia sesión como {lastIdentity.email}</Text>
          </>
        ) : (
          <>
            <Text className="font-display text-[28px] uppercase tracking-wide text-text">Bienvenido de vuelta</Text>
            <Text className="mt-1 text-sm text-textMuted">Inicia sesión para ver tu colección</Text>
          </>
        )}
      </View>

      {!returning ? (
        <TextField
          label="Correo"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
        />
      ) : null}
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="••••••••"
      />

      <Link href="/(auth)/olvide-contrasena" className="mb-4 self-end text-sm font-body-bold" style={{ color: colors.primary }}>
        ¿Olvidaste tu contraseña?
      </Link>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button
        label="Iniciar sesión"
        onPress={onSubmit}
        loading={loading}
        disabled={returning ? !password : !email || !password}
      />

      {returning ? (
        <Text
          onPress={onUseDifferentAccount}
          className="mt-6 self-center text-sm font-body-bold"
          style={{ color: colors.primary }}
        >
          Iniciar con una cuenta distinta
        </Text>
      ) : (
        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-textMuted">¿No tienes cuenta? </Text>
          <Link href="/(auth)/register" className="font-body-bold text-sm" style={{ color: colors.primary }}>
            Regístrate
          </Link>
        </View>
      )}
    </Screen>
  );
}
