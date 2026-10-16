import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { checkUsernameAvailability } from '../../../../lib/api';
import { fetchMe, updateUsername, type Me } from '../../../../lib/users';
import { colors } from '../../../../theme/tokens';

const COOLDOWN_DAYS = 30;

function daysLeft(usernameChangedAt: string | null): number {
  if (!usernameChangedAt) return 0;
  const cooldownEnds = new Date(usernameChangedAt);
  cooldownEnds.setDate(cooldownEnds.getDate() + COOLDOWN_DAYS);
  const diffMs = cooldownEnds.getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

export default function UsernameScreen() {
  const { accessToken, applyTokens } = useAuth();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      fetchMe(accessToken)
        .then(setMe)
        .catch((err) => setError(authErrorMessage(err)));
    }, [accessToken]),
  );

  if (!me) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const remaining = daysLeft(me.usernameChangedAt);
  const blocked = remaining > 0;

  const onUsernameChange = (text: string) => {
    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    setError(null);
  };

  const onSave = async () => {
    if (!accessToken) return;
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setError('El usuario debe tener 3-20 caracteres: minúsculas, números o guion bajo');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const availability = await checkUsernameAvailability(clean);
      if (!availability.available) {
        setError('Ese usuario ya está en uso o no está permitido');
        return;
      }
      const tokens = await updateUsername(accessToken, clean);
      await applyTokens(tokens);
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Text className="mb-6 text-sm text-textMuted">
        Tu @usuario te hace encontrable para transferencias e invitaciones. Solo puedes cambiarlo cada {COOLDOWN_DAYS} días.
      </Text>

      <View className="mb-6 rounded-lg border border-border bg-surface p-4">
        <Text className="text-sm text-textMuted">Actual</Text>
        <Text className="font-body-bold text-lg text-text">@{me.username ?? '—'}</Text>
      </View>

      {blocked ? (
        <Text className="mb-4 text-sm text-danger">
          Podrás cambiarlo de nuevo en {remaining} día{remaining === 1 ? '' : 's'}.
        </Text>
      ) : (
        <>
          <View className="mb-1">
            <Text className="mb-1.5 text-sm font-medium text-textSecondary">Nuevo usuario</Text>
            <View
              className={`h-14 flex-row items-center rounded-md border bg-surfaceElevated pr-4 ${
                error ? 'border-danger' : 'border-border'
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
                autoFocus
                placeholder="minusculas_numeros"
                placeholderTextColor="#A79FC4"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
          <Button label="Guardar" onPress={onSave} loading={saving} disabled={username.trim().length < 3} />
        </>
      )}
    </Screen>
  );
}
