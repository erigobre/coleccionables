export type ItemCategory =
  | 'LIBRO'
  | 'COMIC'
  | 'ART_TOY'
  | 'ESTATUA'
  | 'FIGURA_ACCION'
  | 'JUGUETE'
  | 'ESCULTURA'
  | 'PINTURA'
  | 'OTRO';

export type PackagingCondition = 'SUELTO' | 'BLISTER_SELLADO' | 'BLISTER_ABIERTO' | 'CON_CAJA_SIN_BLISTER';

export type UsageState = 'NUEVO' | 'USADO' | 'ABIERTO';

export type ConservationState = 'MINT' | 'NEAR_MINT' | 'BUEN_ESTADO' | 'CON_DETALLES';

export const CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: 'LIBRO', label: 'Libro' },
  { value: 'COMIC', label: 'Cómic' },
  { value: 'ART_TOY', label: 'Art Toy' },
  { value: 'ESTATUA', label: 'Estatua' },
  { value: 'FIGURA_ACCION', label: 'Figura de acción' },
  { value: 'JUGUETE', label: 'Juguete' },
  { value: 'ESCULTURA', label: 'Escultura' },
  { value: 'PINTURA', label: 'Pintura' },
  { value: 'OTRO', label: 'Otro' },
];

export const PACKAGING_OPTIONS: { value: PackagingCondition; label: string }[] = [
  { value: 'SUELTO', label: 'Suelto' },
  { value: 'BLISTER_SELLADO', label: 'Blister sellado' },
  { value: 'BLISTER_ABIERTO', label: 'Blister abierto' },
  { value: 'CON_CAJA_SIN_BLISTER', label: 'Con caja (sin blister)' },
];

export const USAGE_OPTIONS: { value: UsageState; label: string }[] = [
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'USADO', label: 'Usado' },
  { value: 'ABIERTO', label: 'Abierto' },
];

export const CONSERVATION_OPTIONS: { value: ConservationState; label: string }[] = [
  { value: 'MINT', label: 'Mint' },
  { value: 'NEAR_MINT', label: 'Near Mint' },
  { value: 'BUEN_ESTADO', label: 'Buen estado' },
  { value: 'CON_DETALLES', label: 'Con detalles' },
];

function labelFrom(options: { value: string; label: string }[], value: string | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? '—';
}

export const categoryLabel = (value: string | null | undefined) => labelFrom(CATEGORY_OPTIONS, value);
export const packagingLabel = (value: string | null | undefined) => labelFrom(PACKAGING_OPTIONS, value);
export const usageLabel = (value: string | null | undefined) => labelFrom(USAGE_OPTIONS, value);
export const conservationLabel = (value: string | null | undefined) => labelFrom(CONSERVATION_OPTIONS, value);

// plan §6: los campos de cómic solo aplican si la categoría es Cómic o Libro.
export const isComicCategory = (category: ItemCategory | null) => category === 'COMIC' || category === 'LIBRO';
