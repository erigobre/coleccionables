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

// Resultado de buscar un producto por código de barras (EAN/UPC). `found` es
// false cuando la búsqueda no identificó ningún producto con confianza.
export interface BarcodeLookupResult {
  found: boolean;
  extracted: ExtractedItemData;
}
