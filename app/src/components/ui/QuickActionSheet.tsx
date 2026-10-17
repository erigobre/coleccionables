import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import type { SwipeAction } from './SwipeableRow';

interface QuickActionSheetProps {
  visible: boolean;
  title?: string;
  actions: SwipeAction[];
  onClose: () => void;
}

const COLUMNS = 3;
const TILE_SIZE = 76;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export function QuickActionSheet({ visible, title, actions, onClose }: QuickActionSheetProps) {
  const rows = chunk(actions, COLUMNS);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="rounded-t-2xl bg-surface px-5 pb-8 pt-4" onPress={() => {}}>
          {title ? (
            <Text className="mb-4 text-center text-sm text-textMuted" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          <View style={{ gap: 20 }}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row justify-center" style={{ gap: 20 }}>
                {row.map((action) => (
                  <Pressable
                    key={action.key}
                    onPress={() => {
                      onClose();
                      action.onPress();
                    }}
                    disabled={action.disabled}
                    style={{ width: TILE_SIZE, opacity: action.disabled ? 0.5 : 1 }}
                    className="items-center gap-1.5"
                  >
                    <View
                      style={{ width: TILE_SIZE, height: TILE_SIZE, borderRadius: 18, backgroundColor: action.background }}
                      className="items-center justify-center"
                    >
                      <Ionicons name={action.icon} size={26} color={action.iconColor} />
                    </View>
                    <Text className="text-center text-[11px] text-textSecondary" numberOfLines={2}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
