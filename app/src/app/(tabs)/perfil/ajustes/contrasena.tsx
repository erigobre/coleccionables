import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { TextField } from '../../../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { changePassword } from '../../../../lib/users';

export default function ChangePasswordScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  const onSave = async () => {
    if (!accessToken || !canSave) return;
    setError(null);
    setSaving(true);
    try {
      await changePassword(accessToken, currentPassword, newPassword);
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
        Te avisaremos por correo cada vez que cambies tu contraseña.
      </Text>

      <TextField
        label="Contraseña actual"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoFocus
      />
      <TextField label="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TextField
        label="Repetir nueva contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={confirmPassword.length > 0 && confirmPassword !== newPassword ? 'No coincide' : undefined}
      />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Cambiar contraseña" onPress={onSave} loading={saving} disabled={!canSave} />
    </Screen>
  );
}
