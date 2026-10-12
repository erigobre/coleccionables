import type { ItemFormValues } from './item-form';

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
}

let current: ItemDraft | null = null;

export function setItemDraft(draft: ItemDraft | null) {
  current = draft;
}

export function getItemDraft(): ItemDraft | null {
  return current;
}
