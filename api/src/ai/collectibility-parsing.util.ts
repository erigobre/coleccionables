import { Logger } from '@nestjs/common';
import { ItemCategory, PackagingCondition, UsageState, ConservationState } from '@prisma/client';
import type { BoundingBox, CollectibilityCheckResult, ExtractedItemData, MarketPriceResult } from './ai.types.js';

// Parseo tolerante de JSON compartido entre GeminiService y OpenAiService
// para "¿Es Coleccionable?" y "Buscar precio actual": ambos proveedores
// reciben el mismo prompt (mismo shape de salida esperado) y no pueden forzar
// un JSON Schema porque sus herramientas de búsqueda web no son compatibles
// con eso — así que ambos piden el JSON por prompt y se valida igual aquí.
const logger = new Logger('CollectibilityParsing');

export function parseBoundingBox(value: unknown): BoundingBox | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const box = value as Record<string, unknown>;
  const frac = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : undefined);
  const xMin = frac(box.xMin);
  const yMin = frac(box.yMin);
  const xMax = frac(box.xMax);
  const yMax = frac(box.yMax);
  if (xMin === undefined || yMin === undefined || xMax === undefined || yMax === undefined) return undefined;
  if (xMin >= xMax || yMin >= yMax) return undefined;
  return { xMin, yMin, xMax, yMax };
}

export function parseCollectibilityJson(text: string): {
  result: CollectibilityCheckResult;
  isLikelyCollectible: boolean | null;
  containsIdentifiablePerson: boolean | null;
  moderationNote: string | null;
  boundingBox?: BoundingBox;
} {
  const emptyMarket: MarketPriceResult = {
    averagePrice: null,
    currency: 'MXN',
    availability: 'NO_EN_MERCADO',
    purchaseLinks: [],
    summary: '',
    collectorNotes: '',
  };
  const empty = {
    result: {
      extracted: { suggestedTags: [] } as ExtractedItemData,
      collectibilityStars: 0,
      collectibilityExplanation: '',
      currentMarket: emptyMarket,
    },
    isLikelyCollectible: null,
    containsIdentifiablePerson: null,
    moderationNote: null,
  };
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return empty;

  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
    const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
    const year = num(parsed.releaseYear);
    const summary = str(parsed.collectorSummary);
    const tags = Array.isArray(parsed.suggestedTags)
      ? parsed.suggestedTags.map(str).filter((tag): tag is string => !!tag)
      : [];

    const extracted: ExtractedItemData = {
      name: str(parsed.name),
      category: Object.values(ItemCategory).find((value) => value === parsed.category),
      packagingCondition: Object.values(PackagingCondition).find((value) => value === parsed.packagingCondition),
      usageState: Object.values(UsageState).find((value) => value === parsed.usageState),
      conservationState: Object.values(ConservationState).find((value) => value === parsed.conservationState),
      brand: str(parsed.brand),
      toyLine: str(parsed.toyLine),
      edition: str(parsed.edition),
      scale: str(parsed.scale),
      designer: str(parsed.designer),
      releaseYear: year && year > 1800 && year < 2200 ? Math.trunc(year) : undefined,
      originalSetNumber: str(parsed.originalSetNumber),
      purchasePrice: num(parsed.purchasePrice),
      collectorSummary: summary ? summary.slice(0, 140) : undefined,
      comicCoverNumber: str(parsed.comicCoverNumber),
      comicIssueNumber: str(parsed.comicIssueNumber),
      comicWriter: str(parsed.comicWriter),
      comicPenciler: str(parsed.comicPenciler),
      comicInker: str(parsed.comicInker),
      comicColorist: str(parsed.comicColorist),
      comicPublisher: str(parsed.comicPublisher),
      suggestedTags: tags,
    };

    const marketRaw = parsed.currentMarket && typeof parsed.currentMarket === 'object'
      ? (parsed.currentMarket as Record<string, unknown>)
      : {};
    const currentMarket: MarketPriceResult = {
      averagePrice: typeof marketRaw.averagePrice === 'number' ? marketRaw.averagePrice : null,
      currency: str(marketRaw.currency) ?? 'MXN',
      availability:
        marketRaw.availability === 'DISPONIBLE' || marketRaw.availability === 'AGOTADO' || marketRaw.availability === 'NO_EN_MERCADO'
          ? marketRaw.availability
          : 'NO_EN_MERCADO',
      purchaseLinks: Array.isArray(marketRaw.purchaseLinks) ? marketRaw.purchaseLinks.filter((l): l is string => typeof l === 'string') : [],
      summary: str(marketRaw.summary) ?? '',
      collectorNotes: str(marketRaw.collectorNotes) ?? '',
    };

    const starsRaw = num(parsed.collectibilityStars);
    const collectibilityStars = starsRaw === undefined ? 0 : Math.min(5, Math.max(0, Math.round(starsRaw)));

    return {
      result: {
        extracted,
        collectibilityStars,
        collectibilityExplanation: str(parsed.collectibilityExplanation) ?? '',
        currentMarket,
      },
      isLikelyCollectible: typeof parsed.isLikelyCollectible === 'boolean' ? parsed.isLikelyCollectible : null,
      containsIdentifiablePerson:
        typeof parsed.containsIdentifiablePerson === 'boolean' ? parsed.containsIdentifiablePerson : null,
      moderationNote: str(parsed.moderationNote) ?? null,
      boundingBox: parseBoundingBox(parsed.boundingBox),
    };
  } catch (error) {
    logger.error(`No se pudo parsear la respuesta de "¿Es Coleccionable?": ${text}`, error as Error);
    return empty;
  }
}

export function parseMarketPriceJson(text: string, currency: string): MarketPriceResult {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    return {
      averagePrice: null,
      currency,
      availability: 'NO_EN_MERCADO',
      purchaseLinks: [],
      summary: text.trim() || 'No se pudo determinar el precio de mercado.',
      collectorNotes: '',
    };
  }

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return {
      averagePrice: typeof parsed.averagePrice === 'number' ? parsed.averagePrice : null,
      currency: parsed.currency ?? currency,
      availability: parsed.availability ?? 'NO_EN_MERCADO',
      purchaseLinks: Array.isArray(parsed.purchaseLinks) ? parsed.purchaseLinks : [],
      summary: parsed.summary ?? '',
      collectorNotes: typeof parsed.collectorNotes === 'string' ? parsed.collectorNotes : '',
    };
  } catch (error) {
    logger.error(`No se pudo parsear la respuesta de precio de mercado: ${text}`, error as Error);
    return {
      averagePrice: null,
      currency,
      availability: 'NO_EN_MERCADO',
      purchaseLinks: [],
      summary: text.trim() || 'No se pudo determinar el precio de mercado.',
      collectorNotes: '',
    };
  }
}
