import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { resolvePhotoUrl } from '../../lib/api';
import type { CollectionMemberAvatar } from '../../lib/collections';
import { colors } from '../../theme/tokens';

const SIZE = 22;
const MAX_VISIBLE = 3;

// Estilo Pinterest: pila de avatares (foto o ícono de persona si no tiene) en
// la esquina de la card, "+N" si sobran. Solo aparece si la colección es
// compartida (2+ miembros) — pedido explícito del usuario, solo para
// Colecciones por ahora (no Ubicaciones).
export function MemberAvatarStack({
  members,
  onPress,
}: {
  members: CollectionMemberAvatar[];
  onPress: () => void;
}) {
  if (members.length < 2) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      className="absolute bottom-3 right-3 flex-row items-center"
      accessibilityLabel={`Colección compartida con ${members.length} personas. Ver miembros`}
    >
      {visible.map((member, index) => (
        <View
          key={member.id}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            marginLeft: index === 0 ? 0 : -8,
            borderWidth: 1.5,
            borderColor: colors.surface,
            backgroundColor: colors.surfaceElevated,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: visible.length - index,
          }}
        >
          {member.avatarUrl ? (
            <Image source={{ uri: resolvePhotoUrl(member.avatarUrl) }} style={{ width: SIZE, height: SIZE }} />
          ) : (
            <Ionicons name="person" size={12} color={colors.secondary} />
          )}
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            marginLeft: -8,
            borderWidth: 1.5,
            borderColor: colors.surface,
            backgroundColor: colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="font-body-bold text-[9px] text-white">+{overflow}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
