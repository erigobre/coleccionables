// Mismas listas curadas que ya usa la app (app/src/lib/collection-icons.ts y
// app/src/lib/locations.ts) — duplicadas aquí porque admin/ no comparte
// paquete con app/. El valor guardado (`icon`) debe seguir siendo uno de
// estos nombres de Ionicons para que la app lo pueda renderizar.
export const COLLECTING_ICON_CHOICES = [
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
  'card-outline',
  'ticket-outline',
  'car-sport-outline',
  'watch-outline',
  'leaf-outline',
] as const;

export const LOCATION_ICON_CHOICES = [
  'home',
  'business',
  'storefront',
  'archive',
  'cube',
  'bed',
  'library',
  'briefcase',
  'shirt',
  'car',
  'bus',
  'heart',
  'lock-closed',
] as const;
