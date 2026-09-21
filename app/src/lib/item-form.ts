import {
  CATEGORY_OPTIONS,
  CONSERVATION_OPTIONS,
  PACKAGING_OPTIONS,
  USAGE_OPTIONS,
  type ConservationState,
  type ItemCategory,
  type PackagingCondition,
  type UsageState,
} from './item-enums';
import type { CreateItemDto, ExtractedItemData, Item, UpdateItemDto } from './items';

// Campos escalares compartidos por alta y edición manual (plan §6). Ubicación,
// colecciones, tags y fotos se gestionan aparte porque el backend los expone
// como endpoints de agregar/quitar, no como parte de este dto.
export interface ItemFormValues {
  name: string;
  category: ItemCategory | null;
  packagingCondition: PackagingCondition | null;
  usageState: UsageState | null;
  conservationState: ConservationState | null;
  brand: string;
  toyLine: string;
  edition: string;
  scale: string;
  designer: string;
  releaseYear: string;
  originalSetNumber: string;
  uniqueIdentifier: string;
  purchasePrice: string;
  purchaseLocationText: string;
  acquisitionDate: Date | null;
  quantity: string;
  isGift: boolean;
  notes: string;
  comicCoverNumber: string;
  comicIssueNumber: string;
  comicWriter: string;
  comicPenciler: string;
  comicInker: string;
  comicColorist: string;
  comicPublisher: string;
}

export const EMPTY_ITEM_FORM: ItemFormValues = {
  name: '',
  category: null,
  packagingCondition: null,
  usageState: null,
  conservationState: null,
  brand: '',
  toyLine: '',
  edition: '',
  scale: '',
  designer: '',
  releaseYear: '',
  originalSetNumber: '',
  uniqueIdentifier: '',
  purchasePrice: '',
  purchaseLocationText: '',
  acquisitionDate: null,
  quantity: '1',
  isGift: false,
  notes: '',
  comicCoverNumber: '',
  comicIssueNumber: '',
  comicWriter: '',
  comicPenciler: '',
  comicInker: '',
  comicColorist: '',
  comicPublisher: '',
};

export function itemFormFromItem(item: Item): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    packagingCondition: item.packagingCondition,
    usageState: item.usageState,
    conservationState: item.conservationState,
    brand: item.brand ?? '',
    toyLine: item.toyLine ?? '',
    edition: item.edition ?? '',
    scale: item.scale ?? '',
    designer: item.designer ?? '',
    releaseYear: item.releaseYear ? String(item.releaseYear) : '',
    originalSetNumber: item.originalSetNumber ?? '',
    uniqueIdentifier: item.uniqueIdentifier ?? '',
    purchasePrice: item.purchasePrice ?? '',
    purchaseLocationText: item.purchaseLocationText ?? '',
    acquisitionDate: item.acquisitionDate ? new Date(item.acquisitionDate) : null,
    quantity: String(item.quantity),
    isGift: item.isGift,
    notes: item.notes ?? '',
    comicCoverNumber: item.comicCoverNumber ?? '',
    comicIssueNumber: item.comicIssueNumber ?? '',
    comicWriter: item.comicWriter ?? '',
    comicPenciler: item.comicPenciler ?? '',
    comicInker: item.comicInker ?? '',
    comicColorist: item.comicColorist ?? '',
    comicPublisher: item.comicPublisher ?? '',
  };
}

// Solo acepta valores que existan en las opciones del formulario; si la IA
// devuelve algo fuera de catálogo el campo queda sin seleccionar.
function pickOption<T extends string>(options: { value: T }[], value: string | undefined): T | null {
  return options.find((option) => option.value === value)?.value ?? null;
}

// Prellenado desde el análisis IA (plan §5.3.9): lo no detectado queda vacío.
export function itemFormFromExtracted(extracted: ExtractedItemData): ItemFormValues {
  return {
    ...EMPTY_ITEM_FORM,
    name: extracted.name ?? '',
    category: pickOption(CATEGORY_OPTIONS, extracted.category),
    packagingCondition: pickOption(PACKAGING_OPTIONS, extracted.packagingCondition),
    usageState: pickOption(USAGE_OPTIONS, extracted.usageState),
    conservationState: pickOption(CONSERVATION_OPTIONS, extracted.conservationState),
    brand: extracted.brand ?? '',
    toyLine: extracted.toyLine ?? '',
    edition: extracted.edition ?? '',
    scale: extracted.scale ?? '',
    designer: extracted.designer ?? '',
    releaseYear: extracted.releaseYear ? String(extracted.releaseYear) : '',
    originalSetNumber: extracted.originalSetNumber ?? '',
    uniqueIdentifier: extracted.uniqueIdentifier ?? '',
    comicCoverNumber: extracted.comicCoverNumber ?? '',
    comicIssueNumber: extracted.comicIssueNumber ?? '',
    comicWriter: extracted.comicWriter ?? '',
    comicPenciler: extracted.comicPenciler ?? '',
    comicInker: extracted.comicInker ?? '',
    comicColorist: extracted.comicColorist ?? '',
    comicPublisher: extracted.comicPublisher ?? '',
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function itemFormIsValid(values: ItemFormValues): boolean {
  return (
    values.name.trim().length > 0 &&
    values.category !== null &&
    values.packagingCondition !== null &&
    values.usageState !== null
  );
}

function scalarFields(values: ItemFormValues) {
  return {
    name: values.name.trim(),
    category: values.category as ItemCategory,
    packagingCondition: values.packagingCondition as PackagingCondition,
    usageState: values.usageState as UsageState,
    conservationState: values.conservationState ?? undefined,
    brand: values.brand.trim() || undefined,
    toyLine: values.toyLine.trim() || undefined,
    edition: values.edition.trim() || undefined,
    scale: values.scale.trim() || undefined,
    designer: values.designer.trim() || undefined,
    releaseYear: values.releaseYear.trim() ? Number(values.releaseYear.trim()) : undefined,
    originalSetNumber: values.originalSetNumber.trim() || undefined,
    uniqueIdentifier: values.uniqueIdentifier.trim() || undefined,
    purchasePrice: values.purchasePrice.trim() ? Number(values.purchasePrice.trim()) : undefined,
    purchaseLocationText: values.purchaseLocationText.trim() || undefined,
    acquisitionDate: values.acquisitionDate ? toIsoDate(values.acquisitionDate) : undefined,
    quantity: values.quantity.trim() ? Number(values.quantity.trim()) : undefined,
    isGift: values.isGift,
    notes: values.notes.trim() || undefined,
    comicCoverNumber: values.comicCoverNumber.trim() || undefined,
    comicIssueNumber: values.comicIssueNumber.trim() || undefined,
    comicWriter: values.comicWriter.trim() || undefined,
    comicPenciler: values.comicPenciler.trim() || undefined,
    comicInker: values.comicInker.trim() || undefined,
    comicColorist: values.comicColorist.trim() || undefined,
    comicPublisher: values.comicPublisher.trim() || undefined,
  };
}

export function itemFormToCreateDto(
  values: ItemFormValues,
  extra: { locationId?: string; collectionIds?: string[]; tagIds?: string[]; photoUrls?: string[] },
): CreateItemDto {
  return { ...scalarFields(values), ...extra };
}

export function itemFormToUpdateDto(values: ItemFormValues): UpdateItemDto {
  return scalarFields(values);
}
