import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../context/auth-context';
import { API_BASE_URL, checkUsernameAvailability } from '../../lib/api';
import { colors } from '../../theme/tokens';

// Solo minúsculas, números y guion bajo: debe coincidir con RegisterDto en el backend.
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'blocked';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameSuggestion, setUsernameSuggestion] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onUsernameChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    setUsernameStatus('idle');
    setUsernameSuggestion(null);
  };

  const onUsernameBlur = async () => {
    if (!USERNAME_REGEX.test(username)) return;
    setUsernameStatus('checking');
    try {
      const result = await checkUsernameAvailability(username);
      setUsernameStatus(result.blocked ? 'blocked' : result.available ? 'available' : 'taken');
      setUsernameSuggestion(result.suggestion);
    } catch {
      // Si falla el chequeo se deja "idle": el usuario puede reintentar tocando fuera de nuevo.
      setUsernameStatus('idle');
    }
  };

  const useSuggestion = async () => {
    if (!usernameSuggestion) return;
    const suggested = usernameSuggestion;
    setUsername(suggested);
    setUsernameStatus('checking');
    try {
      const result = await checkUsernameAvailability(suggested);
      setUsernameStatus(result.blocked ? 'blocked' : result.available ? 'available' : 'taken');
      setUsernameSuggestion(result.suggestion);
    } catch {
      setUsernameStatus('idle');
    }
  };

  const canSubmit =
    name.length >= 2 &&
    usernameStatus === 'available' &&
    email.length > 0 &&
    password.length >= 8 &&
    acceptedLegal;

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
        acceptedLegal,
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
        <Text className="font-display text-[28px] uppercase tracking-wide text-text">Crea tu cuenta</Text>
        <Text className="mt-1 text-sm text-textMuted">Empieza a organizar tu colección</Text>
      </View>

      <TextField label="Tu nombre" value={name} onChangeText={setName} autoComplete="name" placeholder="Ej. Erick" />

      <View className="mb-1">
        <Text className="mb-1.5 text-sm font-medium text-textSecondary">Usuario</Text>
        <View
          className={`h-14 flex-row items-center rounded-md border bg-surfaceElevated pr-4 ${
            usernameStatus === 'taken' || usernameStatus === 'blocked' ? 'border-danger' : 'border-border'
          }`}
        >
          <LinearGradient
            colors={[colors.secondary, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 36, height: 36, borderRadius: 18, marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="text-base font-body-bold text-white">@</Text>
          </LinearGradient>
          <TextInput
            className="ml-3 h-full flex-1 text-base text-text"
            value={username}
            onChangeText={onUsernameChange}
            onBlur={onUsernameBlur}
            placeholder="tu_usuario"
            placeholderTextColor="#A79FC4"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameStatus === 'checking' ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        </View>
      </View>

      {usernameStatus === 'taken' ? (
        <View className="mb-4">
          <Text className="text-xs text-danger">Ese usuario ya está en uso.</Text>
          {usernameSuggestion ? (
            <Pressable onPress={useSuggestion} className="mt-1 self-start">
              <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                Usar @{usernameSuggestion} en su lugar
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : usernameStatus === 'blocked' ? (
        <View className="mb-4">
          <Text className="text-xs text-danger">Ese usuario no está permitido. Elige otro.</Text>
        </View>
      ) : (
        <View className="mb-4" />
      )}

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

      <Pressable
        onPress={() => setAcceptedLegal((prev) => !prev)}
        className="mb-4 flex-row items-start"
        hitSlop={8}
      >
        <View
          className="mr-2 mt-0.5 h-5 w-5 items-center justify-center rounded border"
          style={{ borderColor: acceptedLegal ? colors.primary : colors.border, backgroundColor: acceptedLegal ? colors.primary : 'transparent' }}
        >
          {acceptedLegal ? (
            <Text className="text-xs font-body-bold" style={{ color: colors.primaryText }}>
              ✓
            </Text>
          ) : null}
        </View>
        <Text className="flex-1 text-xs text-textMuted">
          Acepto la{' '}
          <Text
            className="font-body-bold"
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL(`${API_BASE_URL}/privacidad`)}
          >
            política de privacidad
          </Text>{' '}
          y las{' '}
          <Text
            className="font-body-bold"
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL(`${API_BASE_URL}/terminos`)}
          >
            condiciones de uso
          </Text>
          .
        </Text>
      </Pressable>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Crear cuenta" onPress={onSubmit} loading={loading} disabled={!canSubmit} />

      <View className="mt-6 flex-row justify-center">
        <Text className="text-sm text-textMuted">¿Ya tienes cuenta? </Text>
        <Link href="/(auth)/login" className="font-body-bold text-sm" style={{ color: colors.primary }}>
          Inicia sesión
        </Link>
      </View>
    </Screen>
  );
}
