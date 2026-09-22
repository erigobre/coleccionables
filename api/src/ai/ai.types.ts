// Estructura devuelta por el análisis de fotos con IA (plan §5.3.9-10).
// Todo campo es opcional: lo que la IA no logre detectar queda vacío/sin
// seleccionar, y el usuario lo completa manualmente en el formulario.
export interface ExtractedItemData {
  name?: string;
  category?: string;
  packagingCondition?: string;
  usageState?: string;
  conservationState?: string;
  brand?: string;
  toyLine?: string;
  edition?: string;
  scale?: string;
  designer?: string;
  releaseYear?: number;
  originalSetNumber?: string;
  uniqueIdentifier?: string;
  comicCoverNumber?: string;
  comicIssueNumber?: string;
  comicWriter?: string;
  comicPenciler?: string;
  comicInker?: string;
  comicColorist?: string;
  comicPublisher?: string;
  suggestedTags: string[]; // siempre debe incluir un intento de "color principal"
}

export type MarketAvailability = 'DISPONIBLE' | 'AGOTADO' | 'NO_EN_MERCADO';

export interface MarketPriceResult {
  averagePrice: number | null;
  currency: string;
  availability: MarketAvailability;
  purchaseLinks: string[];
  summary: string;
  collectorNotes: string;
}

export interface ImageInput {
  buffer: Buffer;
  mimetype: string;
}

// Conteo de tokens que devuelve Gemini en cada respuesta (usageMetadata), para
// poder calcular el costo real en USD de cada llamada (módulo FrikiTokens:
// permite comparar lo cobrado en FT contra lo que la IA cuesta de verdad).
export interface GeminiUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

// Señal de moderación de contenido para fotos subidas por el usuario (ver
// GeminiService.analyzePhotos). Combina dos fuentes de confianza distinta:
// - blockedByGoogleSafety: el filtro de seguridad propio de Gemini (auditado
//   por Google para detectar contenido sexual/violento/etc.) — la señal más
//   confiable, la única que dispara una suspensión automática de la cuenta.
// - isLikelyCollectible/containsIdentifiablePerson: un check propio, pedido
//   al mismo modelo dentro del análisis, para el caso "esto no es un objeto
//   coleccionable" (ej. el rostro de una persona real). Es menos confiable
//   (una figura/muñeco/busto con rostro humano NO debería activarlo, pero
//   puede haber falsos positivos), así que solo se usa para marcar el
//   incidente para revisión humana, nunca para suspender por sí sola.
export interface ModerationSignal {
  blockedByGoogleSafety: boolean;
  blockedCategories: string[];
  isLikelyCollectible: boolean | null;
  containsIdentifiablePerson: boolean | null;
  moderationNote: string | null;
}

export interface GeminiCallResult<T> {
  result: T;
  usage: GeminiUsage;
  moderation?: ModerationSignal;
}

// Resultado de buscar un producto por código de barras (EAN/UPC). `found` es
// false cuando la búsqueda no identificó ningún producto con confianza.
export interface BarcodeLookupResult {
  found: boolean;
  extracted: ExtractedItemData;
}
