import type { ItemFormValues } from './item-form';

// Borrador que la pantalla de captura le deja a "Nuevo objeto". Se usa un módulo
// en vez de params de ruta porque las rutas solo llevan strings y aquí viajan
// valores ya tipados, fotos y tags sugeridos.
export interface ItemDraft {
  values: ItemFormValues;
  photoUrls: string[];
  suggestedTags: string[];
  // Aviso opcional que "Nuevo objeto" muestra arriba del formulario.
  notice?: string;
}

let current: ItemDraft | null = null;

export function setItemDraft(draft: ItemDraft | null) {
  current = draft;
}

export function getItemDraft(): ItemDraft | null {
  return current;
}
