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
}

let current: ItemDraft | null = null;

export function setItemDraft(draft: ItemDraft | null) {
  current = draft;
}

export function getItemDraft(): ItemDraft | null {
  return current;
}
