import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Screen } from '../../../../components/ui/Screen';
import { TextField } from '../../../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import {
  fetchOrganizationInfo,
  inviteOrCreateMember,
  removeOrgMember,
  type OrganizationInfo,
  type OrganizationMember,
} from '../../../../lib/organizations';
import { colors } from '../../../../theme/tokens';

export default function FamilyScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [org, setOrg] = useState<OrganizationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [inviting, setInviting] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!accessToken) return;
    fetchOrganizationInfo(accessToken)
      .then(setOrg)
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!org) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? <Text className="px-8 text-center text-sm text-danger">{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const hasActivePlan = !!org.activeFtPlan;
  const maxMembers = org.activeFtPlan ? 1 + org.activeFtPlan.maxInvitedMembers : 1;
  const canInviteMore = hasActivePlan && org.members.length < maxMembers;

  const onInvite = async () => {
    if (!accessToken) return;
    setError(null);
    setInfo(null);
    setInviting(true);
    try {
      const result = await inviteOrCreateMember(accessToken, {
        name: name.trim(),
        email: email.trim(),
        temporaryPassword: tempPassword,
      });
      setInfo(
        result.created
          ? 'Se creó la cuenta y se le envió la contraseña temporal por correo.'
          : 'Esa persona ya tenía cuenta: se le mandó una invitación para aceptar.',
      );
      setName('');
      setEmail('');
      setTempPassword('');
      setShowInvite(false);
      load();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const onRemove = (member: OrganizationMember) => {
    Alert.alert(
      `¿Expulsar a ${member.name}?`,
      'Se le crea su propia cuenta/monedero independiente de inmediato. Sus objetos y su saldo personal (gratis y comprado) no se ven afectados, pero perderá acceso al monedero de suscripción de esta familia.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expulsar',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken) return;
            setError(null);
            setRemovingId(member.id);
            try {
              await removeOrgMember(accessToken, member.id);
              load();
            } catch (err) {
              setError(authErrorMessage(err));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Text className="mb-6 text-sm text-textMuted">
        Las personas que invites comparten tu monedero de suscripción, pero conservan sus propios objetos,
        colecciones y su saldo gratis/comprado.
      </Text>

      {!hasActivePlan ? (
        <View className="mb-6 rounded-lg border border-border bg-surface p-4">
          <Text className="mb-3 text-sm text-textSecondary">Necesitas una suscripción activa para invitar familiares.</Text>
          <Button label="Ver planes de suscripción" variant="secondary" onPress={() => router.push('/(tabs)/perfil/wallet/suscripcion')} />
        </View>
      ) : null}

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
      {info ? <Text className="mb-4 text-sm text-primary">{info}</Text> : null}

      <View className="mb-6 rounded-lg border border-border bg-surface px-4">
        {org.members.map((member) => (
          <View key={member.id} className="flex-row items-center gap-3 border-b border-border py-4">
            <Ionicons name="person-circle-outline" size={28} color={colors.textMuted} />
            <View className="flex-1">
              <Text className="text-base text-text">{member.name}</Text>
              {member.username ? <Text className="text-xs text-textMuted">@{member.username}</Text> : null}
            </View>
            {member.role === 'OWNER' ? (
              <Text className="text-xs uppercase text-textMuted">Dueño</Text>
            ) : removingId === member.id ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Pressable onPress={() => onRemove(member)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {hasActivePlan ? (
        showInvite ? (
          <View>
            <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
            <TextField label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <TextField label="Contraseña temporal" value={tempPassword} onChangeText={setTempPassword} secureTextEntry />
            <Text className="mb-4 text-xs text-textMuted">
              Si ese correo ya tiene cuenta, se usará solo para identificarla — se le manda una invitación para
              aceptar en vez de crear una cuenta nueva.
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    setShowInvite(false);
                    setName('');
                    setEmail('');
                    setTempPassword('');
                  }}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Invitar"
                  onPress={onInvite}
                  loading={inviting}
                  disabled={name.trim().length < 2 || !email.includes('@') || tempPassword.length < 8}
                />
              </View>
            </View>
          </View>
        ) : canInviteMore ? (
          <Button label="+ Invitar familiar" onPress={() => setShowInvite(true)} />
        ) : (
          <Text className="text-center text-sm text-textMuted">Tu plan permite hasta {maxMembers} personas en tu familia.</Text>
        )
      ) : null}
    </Screen>
  );
}
