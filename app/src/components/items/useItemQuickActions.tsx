import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share } from 'react-native';
import { authErrorMessage, useAuth } from '../../context/auth-context';
import { cloneItem, deleteItem, shareItem, type Item, type ItemActionType } from '../../lib/items';
import { colors } from '../../theme/tokens';
import type { SwipeAction } from '../ui/SwipeableRow';
import { RequestAuthorizationModal } from './RequestAuthorizationModal';

interface UseItemQuickActionsOptions {
  // Refresca la lista (clonar agrega un objeto nuevo; eliminar lo quita).
  onChanged: () => void;
  onError: (message: string) => void;
}

// Acciones rápidas de Compartir/Clonar/Editar/Eliminar/Transferir, reusadas tanto
// por el swipe de la lista de Objetos como por el long-press de la cuadrícula de
// una Colección — ambas vistas disparan la misma lógica, solo cambia el gesto.
export function useItemQuickActions(item: Item, { onChanged, onError }: UseItemQuickActionsOptions) {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const [requestAction, setRequestAction] = useState<ItemActionType | null>(null);
  const [busyKey, setBusyKey] = useState<'share' | 'clone' | null>(null);

  const isRealOwner = !!user && item.ownerId === user.sub;
  const pendingActions = item.myPendingActionRequests ?? [];

  const onShare = async () => {
    if (!accessToken) return;
    setBusyKey('share');
    try {
      const { url } = await shareItem(accessToken, item.id);
      await Share.share({ message: `${item.name} — mira este objeto de mi colección en Frikidex: ${url}` });
    } catch (err) {
      onError(authErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const onClone = async () => {
    if (!accessToken) return;
    setBusyKey('clone');
    try {
      const cloned = await cloneItem(accessToken, item.id);
      router.push(`/objeto/${cloned.id}`);
    } catch (err) {
      onError(authErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const onEdit = () => router.push(`/(tabs)/objetos/${item.id}/edit`);

  const onDelete = () => {
    if (!accessToken) return;
    if (!isRealOwner) {
      setRequestAction('DELETE');
      return;
    }
    Alert.alert('Eliminar objeto', `¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(accessToken, item.id);
            onChanged();
          } catch (err) {
            onError(authErrorMessage(err));
          }
        },
      },
    ]);
  };

  const onTransfer = () => {
    if (isRealOwner) {
      router.push(`/(tabs)/objetos/${item.id}/vender`);
    } else {
      setRequestAction('TRANSFER');
    }
  };

  const leftActions: SwipeAction[] = [
    {
      key: 'share',
      label: 'Compartir',
      icon: 'share-outline',
      background: colors.secondary,
      iconColor: colors.white,
      onPress: onShare,
      disabled: busyKey === 'share',
    },
    {
      key: 'clone',
      label: 'Clonar',
      icon: 'copy-outline',
      background: colors.primary,
      iconColor: colors.primaryText,
      onPress: onClone,
      disabled: busyKey === 'clone',
    },
    {
      key: 'edit',
      label: 'Editar',
      icon: 'pencil-outline',
      background: colors.surfaceElevated,
      iconColor: colors.text,
      onPress: onEdit,
    },
  ];

  const rightActions: SwipeAction[] = [
    {
      key: 'delete',
      label: isRealOwner ? 'Eliminar' : 'Pedir elim.',
      icon: 'trash-outline',
      background: colors.danger,
      iconColor: colors.dangerText,
      onPress: onDelete,
      disabled: !isRealOwner && pendingActions.includes('DELETE'),
    },
    {
      key: 'transfer',
      label: isRealOwner ? 'Transferir' : 'Pedir transf.',
      icon: 'swap-horizontal',
      background: colors.transfer,
      iconColor: colors.primaryText,
      onPress: onTransfer,
      disabled: !isRealOwner && pendingActions.includes('TRANSFER'),
    },
  ];

  const modal =
    accessToken && requestAction ? (
      <RequestAuthorizationModal
        visible
        action={requestAction}
        item={item}
        accessToken={accessToken}
        onClose={() => setRequestAction(null)}
        onSent={() => {
          setRequestAction(null);
          onChanged();
        }}
      />
    ) : null;

  return { leftActions, rightActions, allActions: [...leftActions, ...rightActions], modal };
}
