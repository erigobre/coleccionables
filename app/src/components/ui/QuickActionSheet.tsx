import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import type { SwipeAction } from './SwipeableRow';

interface QuickActionSheetProps {
  visible: boolean;
  title?: string;
  actions: SwipeAction[];
  onClose: () => void;
}

export function QuickActionSheet({ visible, title, actions, onClose }: QuickActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="gap-2 rounded-t-2xl bg-surface px-4 pb-8 pt-4" onPress={() => {}}>
          {title ? (
            <Text className="mb-1 text-center text-sm text-textMuted" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              disabled={action.disabled}
              className="flex-row items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: action.background, opacity: action.disabled ? 0.5 : 1 }}
            >
              <Ionicons name={action.icon} size={20} color={action.iconColor} />
              <Text style={{ color: action.iconColor }} className="font-body-medium text-sm">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
