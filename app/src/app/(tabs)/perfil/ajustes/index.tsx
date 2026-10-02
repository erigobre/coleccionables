import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { ImageCropper } from '../../../../components/ui/ImageCropper';
import { Screen } from '../../../../components/ui/Screen';
import { TextField } from '../../../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { resolvePhotoUrl } from '../../../../lib/api';
import { fetchMe, updateMe, uploadAvatar, type Me } from '../../../../lib/users';
import { colors } from '../../../../theme/tokens';

function MenuRow({ icon, label, value, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; href: string }) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-row items-center gap-3 border-b border-border py-4">
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <Text className="flex-1 text-base text-text">{label}</Text>
        {value ? <Text className="text-sm text-textMuted">{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </Link>
  );
}

export default function AjustesScreen() {
  const { accessToken, applyTokens } = useAuth();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    fetchMe(accessToken)
      .then((data) => {
        setMe(data);
        setName(data.name);
      })
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSaveName = async () => {
    if (!accessToken || name.trim().length < 2) return;
    setError(null);
    setSavingName(true);
    try {
      const tokens = await updateMe(accessToken, { name: name.trim() });
      await applyTokens(tokens);
      setEditingName(false);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const onPickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permite el acceso a tus fotos para cambiar tu foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    setCropUri(result.assets[0].uri);
  };

  const onCropConfirmed = async (croppedUri: string) => {
    setCropUri(null);
    if (!accessToken) return;
    setError(null);
    setSavingPhoto(true);
    try {
      const url = await uploadAvatar(accessToken, croppedUri);
      const tokens = await updateMe(accessToken, { avatarUrl: url });
      await applyTokens(tokens);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSavingPhoto(false);
    }
  };

  if (!me) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return (
    <Screen>
      <View className="mb-8 items-center">
        <Pressable onPress={onPickPhoto} disabled={savingPhoto} className="mb-3">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surfaceElevated">
            {me.avatarUrl ? (
              <Image source={{ uri: resolvePhotoUrl(me.avatarUrl) }} style={{ width: 80, height: 80 }} />
            ) : (
              <Ionicons name="person" size={36} color={colors.secondary} />
            )}
          </View>
          <View className="absolute -bottom-1 -right-1 h-7 w-7 items-center justify-center rounded-full bg-primary">
            {savingPhoto ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Ionicons name="camera" size={14} color={colors.primaryText} />
            )}
          </View>
        </Pressable>

        {editingName ? (
          <View className="w-full">
            <TextField label="Nombre" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    setEditingName(false);
                    setName(me.name);
                  }}
                />
              </View>
              <View className="flex-1">
                <Button label="Guardar" onPress={onSaveName} loading={savingName} disabled={name.trim().length < 2} />
              </View>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setEditingName(true)} className="flex-row items-center gap-2">
            <Text className="font-body-bold text-lg text-text">{me.name}</Text>
            <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
          </Pressable>
        )}
        <Text className="text-sm text-textMuted">{me.email}</Text>
      </View>

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-8 rounded-lg border border-border bg-surface px-4">
        <MenuRow icon="at-outline" label="@usuario" value={me.username ?? '—'} href="/(tabs)/perfil/ajustes/usuario" />
        <MenuRow
          icon="mail-outline"
          label="Correo"
          value={me.emailVerified ? 'Verificado' : 'Sin verificar'}
          href="/(tabs)/perfil/ajustes/correo"
        />
        <MenuRow icon="lock-closed-outline" label="Contraseña" href="/(tabs)/perfil/ajustes/contrasena" />
        <MenuRow icon="keypad-outline" label="PIN y bloqueo" href="/(tabs)/perfil/ajustes/pin" />
      </View>

      <Pressable onPress={() => router.push('/(tabs)/perfil/ajustes/eliminar-cuenta')} className="items-center py-6">
        <Text className="text-sm text-textMuted">Eliminar cuenta</Text>
      </Pressable>

      {cropUri ? <ImageCropper uri={cropUri} lockedRatio="1:1" onCancel={() => setCropUri(null)} onConfirm={onCropConfirmed} /> : null}
    </Screen>
  );
}
