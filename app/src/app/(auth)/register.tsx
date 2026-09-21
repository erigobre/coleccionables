import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../context/auth-context';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.length >= 2 && organizationName.length >= 2 && email.length > 0 && password.length >= 8;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        organizationName: organizationName.trim(),
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="mb-10 mt-16">
        <Text className="text-2xl font-bold text-text">Crea tu cuenta</Text>
        <Text className="mt-1 text-sm text-textMuted">Empieza a organizar tu colección</Text>
      </View>

      <TextField label="Tu nombre" value={name} onChangeText={setName} autoComplete="name" placeholder="Ej. Erick" />
      <TextField
        label="Nombre de tu cuenta"
        value={organizationName}
        onChangeText={setOrganizationName}
        placeholder="Ej. Mi colección, o el nombre de tu familia/negocio"
      />
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
        autoComplete="password-new"
        placeholder="Mínimo 8 caracteres"
      />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Crear cuenta" onPress={onSubmit} loading={loading} disabled={!canSubmit} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-textMuted">¿Ya tienes cuenta? </Text>
        <Link href="/(auth)/login" className="text-sm font-semibold text-primary">
          Inicia sesión
        </Link>
      </View>
    </Screen>
  );
}
