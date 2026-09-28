import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

export const DEFAULT_COLLECTION_ICON: IconName = 'albums-outline';

// Selección curada de íconos para colecciones (no hay upload de imagen para esto, plan §5.2).
export const COLLECTION_ICON_CHOICES: IconName[] = [
  'albums-outline',
  'book-outline',
  'game-controller-outline',
  'disc-outline',
  'shirt-outline',
  'football-outline',
  'skull-outline',
  'planet-outline',
  'star-outline',
  'diamond-outline',
  'color-palette-outline',
  'flash-outline',
  'rocket-outline',
  'paw-outline',
  'trophy-outline',
  'gift-outline',
  'cube-outline',
  'camera-outline',
];

// Íconos que solo usan las colecciones del sistema (no se pueden elegir a mano).
const SYSTEM_ICONS: IconName[] = ['pricetag-outline'];

export function collectionIconName(icon: string | null): IconName {
  if (icon && ([...COLLECTION_ICON_CHOICES, ...SYSTEM_ICONS] as string[]).includes(icon)) {
    return icon as IconName;
  }
  return DEFAULT_COLLECTION_ICON;
}
