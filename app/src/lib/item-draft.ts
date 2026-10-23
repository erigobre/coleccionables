import { itemFormFromItem, type ItemFormValues } from './item-form';
import type { Item, MarketPriceResult } from './items';

// Borrador que la pantalla de captura le deja a "Nuevo objeto". Se usa un módulo
// en vez de params de ruta porque las rutas solo llevan strings y aquí viajan
// valores ya tipados, fotos y tags sugeridos.
export type ItemDraftSource = 'manual' | 'ai' | 'barcode';

export interface ItemDraft {
  values: ItemFormValues;
  photoUrls: string[];
  suggestedTags: string[];
  // Recorte 1:1 ya generado por el análisis IA (bounding box de Gemini). Si no
  // viene (alta manual/código de barras), el backend genera uno de respaldo.
  avatarUrl?: string;
  // Aviso opcional que "Nuevo objeto" muestra arriba del formulario.
  notice?: string;
  // De dónde vino el alta: determina, por ejemplo, si se muestra el campo de
  // identificador único (SKU) — solo tiene sentido pedirlo si se llegó por
  // escaneo de código de barras.
  source?: ItemDraftSource;
  // Si analyzeItemPhotos detectó una posible persona real: el objeto se debe
  // crear retenido (ver CreateItemDto.moderationFlagId).
  moderationFlagId?: string;
  // Si el draft viene de "Traspasar a objetos" en la wishlist: una vez que el
  // objeto se guarda con éxito, "Nuevo objeto" borra este item de wishlist. Se
  // deja intacto si el usuario cancela el alta, para no perder el dato.
  wishlistItemId?: string;
  // Prellenado de ubicación/colecciones (solo lo usa el clon, ver buildCloneDraft):
  // la captura por IA/código de barras nunca los trae, por eso no estaban antes.
  locationId?: string | null;
  collectionIds?: string[];
  // Si el draft viene de "¿Es Coleccionable?" → "Agregar objeto": precio
  // actual de mercado a adjuntar al objeto justo después de crearlo (ver
  // new.tsx), sin cobrar FT de nuevo.
  pendingMarketPrice?: MarketPriceResult;
}

let current: ItemDraft | null = null;

export function setItemDraft(draft: ItemDraft | null) {
  current = draft;
}

export function getItemDraft(): ItemDraft | null {
  return current;
}

// "Clonar" ya no crea el objeto directo: deja un borrador para que "Nuevo
// objeto" abra con todo copiado (nombre, fotos, características, tags,
// ubicación y colecciones) y el usuario decida si lo modifica antes de guardar.
export function buildCloneDraft(item: Item): ItemDraft {
  return {
    values: itemFormFromItem(item),
    photoUrls: item.photos.map((photo) => photo.url),
    suggestedTags: item.tags.map((ref) => ref.tag.name),
    locationId: item.currentLocationId,
    collectionIds: item.collections.map((ref) => ref.collectionId),
    notice: `Clonando "${item.name}". Modifica lo que quieras y guarda para crear el objeto nuevo.`,
    source: 'manual',
  };
}
