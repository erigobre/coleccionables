// Lista cerrada de iconos para ubicaciones. La app muestra estas mismas claves
// con Ionicons (app/src/lib/locations.ts). Agregar uno nuevo exige tocar ambos lados.
export const LOCATION_ICONS = [
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

export type LocationIcon = (typeof LOCATION_ICONS)[number];
