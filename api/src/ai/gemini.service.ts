import { Injectable, Logger } from '@nestjs/common';
import {
  FinishReason,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  HarmProbability,
  Type,
  type GenerateContentResponse,
  type Schema,
  type SafetySetting,
} from '@google/genai';
import {
  ItemCategory,
  PackagingCondition,
  UsageState,
  ConservationState,
} from '@prisma/client';
import type {
  BarcodeLookupResult,
  ExtractedItemData,
  GeminiCallResult,
  GeminiUsage,
  ImageInput,
  MarketPriceResult,
  ModerationSignal,
} from './ai.types.js';

const MODEL = 'gemini-flash-latest';

// Precios de gemini-flash-latest en USD por cada 1M de tokens (ajustar si
// cambia la tarifa publicada por Google). Se usan solo para estimar el costo
// real de cada llamada y comparar contra lo cobrado en FrikiTokens — no
// afectan el cobro al usuario, que siempre es en FT según ft_service_configs.
const USD_PER_1M_INPUT_TOKENS = 0.075;
const USD_PER_1M_OUTPUT_TOKENS = 0.3;

// Umbral bajo/medio deliberadamente estricto: falsos positivos aquí solo
// cuestan un reintento ("sube otra foto"), pero un falso negativo en
// contenido sexual es lo que este chequeo existe para evitar.
// HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT existe en el enum del SDK pero la API
// de generateContent la rechaza con 400 INVALID_ARGUMENT (es válida solo para
// otros endpoints, ej. generación de imágenes) — no incluirla aquí.
const SAFETY_SETTINGS: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Categorías de HarmCategory que, si Google las marca con probabilidad
// media/alta (aunque no lleguen a bloquear la respuesta completa), igual se
// tratan como incidente de moderación.
const WATCHED_HARM_CATEGORIES = new Set<HarmCategory>([
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
]);

const ITEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    category: { type: Type.STRING, enum: Object.values(ItemCategory) },
    packagingCondition: { type: Type.STRING, enum: Object.values(PackagingCondition) },
    usageState: { type: Type.STRING, enum: Object.values(UsageState) },
    conservationState: { type: Type.STRING, enum: Object.values(ConservationState) },
    brand: { type: Type.STRING },
    toyLine: { type: Type.STRING },
    edition: { type: Type.STRING },
    scale: { type: Type.STRING },
    designer: { type: Type.STRING },
    releaseYear: { type: Type.INTEGER },
    originalSetNumber: { type: Type.STRING },
    uniqueIdentifier: { type: Type.STRING },
    comicCoverNumber: { type: Type.STRING },
    comicIssueNumber: { type: Type.STRING },
    comicWriter: { type: Type.STRING },
    comicPenciler: { type: Type.STRING },
    comicInker: { type: Type.STRING },
    comicColorist: { type: Type.STRING },
    comicPublisher: { type: Type.STRING },
    suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
    // Moderación: se piden como parte del mismo análisis (no una llamada
    // aparte) para no duplicar el costo de IA. Ver ModerationSignal.
    isLikelyCollectible: { type: Type.BOOLEAN },
    containsIdentifiablePerson: { type: Type.BOOLEAN },
    moderationNote: { type: Type.STRING },
  },
  required: ['suggestedTags', 'isLikelyCollectible', 'containsIdentifiablePerson'],
};

const ANALYZE_PROMPT = `Eres un experto catalogador de coleccionables (juguetes, art toys, estatuas, cómics, libros, figuras de acción).
Analiza las fotos adjuntas de un objeto coleccionable y extrae la información estructurada que puedas identificar con confianza.
Si no puedes determinar un campo con certeza, omítelo (no inventes datos).
Siempre incluye en "suggestedTags" al menos un intento de identificar el color principal del objeto, y si reconoces la franquicia/personaje, inclúyela también como tag.

Además, evalúa las fotos para moderación de contenido (esto es tan importante como los datos del objeto):
- "isLikelyCollectible": true si las fotos muestran principalmente un objeto coleccionable; false si muestran otra cosa (una persona, un paisaje, un documento, una pantalla, etc.).
- "containsIdentifiablePerson": true SOLO si se ve el rostro de una persona real y reconocible (una fotografía de un ser humano de carne y hueso). Una figura de acción, muñeco, busto, estatua o arte que representa un rostro humano NO cuenta como persona real: en esos casos responde false.
- "moderationNote": si marcaste isLikelyCollectible en false o containsIdentifiablePerson en true, describe brevemente en español y de forma neutral qué se ve en la foto (para que un moderador humano lo entienda sin ver la imagen). Si no hay nada que señalar, deja este campo vacío.

Responde únicamente con el JSON solicitado.`;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async analyzePhotos(photos: ImageInput[]): Promise<GeminiCallResult<ExtractedItemData>> {
    const imageParts = photos.map((photo) => ({
      inlineData: { data: photo.buffer.toString('base64'), mimeType: photo.mimetype },
    }));

    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: ANALYZE_PROMPT }, ...imageParts] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: ITEM_SCHEMA,
        safetySettings: SAFETY_SETTINGS,
      },
    });

    const usage = this.extractUsage(response);
    const moderation = this.extractModerationSignal(response);
    const text = response.text ?? '{}';
    try {
      const parsed = JSON.parse(text) as Partial<ExtractedItemData> & {
        isLikelyCollectible?: boolean;
        containsIdentifiablePerson?: boolean;
        moderationNote?: string;
      };
      const { isLikelyCollectible, containsIdentifiablePerson, moderationNote, ...itemFields } = parsed;
      moderation.isLikelyCollectible = isLikelyCollectible ?? null;
      moderation.containsIdentifiablePerson = containsIdentifiablePerson ?? null;
      moderation.moderationNote = moderationNote?.trim() || null;
      return { result: { suggestedTags: [], ...itemFields }, usage, moderation };
    } catch (error) {
      this.logger.error(`No se pudo parsear la respuesta de análisis de IA: ${text}`, error);
      return { result: { suggestedTags: [] }, usage, moderation };
    }
  }

  // Combina las 2 fuentes de señal de seguridad que expone el SDK de Gemini:
  // el bloqueo global del prompt (promptFeedback.blockReason) y las
  // calificaciones por candidato (safetyRatings / finishReason). Cualquiera de
  // las dos alcanza para marcar `blockedByGoogleSafety = true`.
  private extractModerationSignal(response: GenerateContentResponse): ModerationSignal {
    const blockedCategories = new Set<string>();

    if (response.promptFeedback?.blockReason) {
      blockedCategories.add(`prompt:${response.promptFeedback.blockReason}`);
    }

    for (const candidate of response.candidates ?? []) {
      if (candidate.finishReason === FinishReason.SAFETY) {
        blockedCategories.add('finishReason:SAFETY');
      }
      for (const rating of candidate.safetyRatings ?? []) {
        const isHighRisk = rating.probability === HarmProbability.HIGH || rating.probability === HarmProbability.MEDIUM;
        const isWatched = rating.category !== undefined && WATCHED_HARM_CATEGORIES.has(rating.category);
        if (rating.blocked || (isHighRisk && isWatched)) {
          blockedCategories.add(rating.category ?? 'unknown');
        }
      }
    }

    return {
      blockedByGoogleSafety: blockedCategories.size > 0,
      blockedCategories: Array.from(blockedCategories),
      isLikelyCollectible: null,
      containsIdentifiablePerson: null,
      moderationNote: null,
    };
  }

  // Igual que lookupMarketPrice: googleSearch no se puede combinar con
  // responseSchema, así que se pide JSON por prompt y se valida a mano.
  async lookupBarcode(barcode: string): Promise<GeminiCallResult<BarcodeLookupResult>> {
    const prompt = `Identifica el producto coleccionable (juguete, art toy, estatua, cómic, libro, figura de acción) que corresponde al código de barras EAN/UPC ${barcode}.
Busca el código en la web. Si no encuentras un producto con certeza que corresponda a ESTE código, responde con "found": false y no inventes datos. Si el producto no es un coleccionable pero sí lo identificas, igual devuélvelo.

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown) con esta forma; omite cualquier campo que no conozcas con certeza:
{
  "found": true | false,
  "name": "<nombre del producto en español o como se vende>",
  "category": ${Object.values(ItemCategory)
    .map((value) => `"${value}"`)
    .join(' | ')},
  "brand": "<marca>",
  "toyLine": "<línea/serie/modelo>",
  "edition": "<edición o variante>",
  "scale": "<escala o altura>",
  "designer": "<diseñador/artista>",
  "releaseYear": <año como número>,
  "originalSetNumber": "<número de set/SKU del fabricante>",
  "comicWriter": "<solo cómics/libros>",
  "comicPublisher": "<solo cómics/libros>",
  "suggestedTags": ["<franquicia/personaje>", "<color principal si aplica>"]
}`;

    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    return { result: this.parseBarcodeResponse(response.text ?? '', barcode), usage: this.extractUsage(response) };
  }

  private parseBarcodeResponse(text: string, barcode: string): BarcodeLookupResult {
    const notFound: BarcodeLookupResult = { found: false, extracted: { suggestedTags: [] } };
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) return notFound;

    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const str = (value: unknown) =>
        typeof value === 'string' && value.trim() ? value.trim() : undefined;
      const name = str(parsed.name);
      if (parsed.found === false || !name) return notFound;

      const category = Object.values(ItemCategory).find((value) => value === parsed.category);
      const year = typeof parsed.releaseYear === 'number' ? Math.trunc(parsed.releaseYear) : undefined;
      const tags = Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags.map(str).filter((tag): tag is string => !!tag)
        : [];

      return {
        found: true,
        extracted: {
          name,
          category,
          brand: str(parsed.brand),
          toyLine: str(parsed.toyLine),
          edition: str(parsed.edition),
          scale: str(parsed.scale),
          designer: str(parsed.designer),
          releaseYear: year && year > 1800 && year < 2200 ? year : undefined,
          originalSetNumber: str(parsed.originalSetNumber),
          comicWriter: str(parsed.comicWriter),
          comicPublisher: str(parsed.comicPublisher),
          uniqueIdentifier: barcode,
          suggestedTags: tags,
        },
      };
    } catch (error) {
      this.logger.error(`No se pudo parsear la respuesta de búsqueda por código: ${text}`, error);
      return notFound;
    }
  }

  // Nota: la API de Gemini no permite combinar `responseSchema` (modo JSON forzado)
  // con la herramienta `googleSearch` en la misma llamada, así que aquí se le pide
  // al modelo por prompt que responda ÚNICAMENTE con un JSON y se parsea de forma
  // tolerante (buscando el primer/último `{`/`}` del texto de respuesta).
  async lookupMarketPrice(
    itemDescription: string,
    currency: string,
    knownFields: string,
  ): Promise<GeminiCallResult<MarketPriceResult>> {
    const prompt = `Busca el precio promedio actual de mercado (reventa/coleccionismo, no precio original de lista) para este objeto coleccionable:
"${itemDescription}"

Estos datos ya los conoce el usuario y están guardados en su ficha (NO los repitas ni los parafrasees en "collectorNotes"):
${knownFields || '(sin datos adicionales registrados)'}

Además del precio, busca y aporta datos de interés para un coleccionista que NO estén ya en la lista anterior: qué tan raro o común es, si tuvo una tirada limitada o edición especial, si está descontinuado, variantes conocidas, o cualquier dato que explique por qué le importaría a un coleccionista. Si no encuentras nada relevante que no esté ya cubierto, deja el texto breve o vacío en vez de inventar o repetir.

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "averagePrice": <número en ${currency} o null si no lo encuentras>,
  "currency": "${currency}",
  "availability": "DISPONIBLE" | "AGOTADO" | "NO_EN_MERCADO",
  "purchaseLinks": [<URLs relevantes como strings, puede ser vacío>],
  "summary": "<resumen breve en español de 1-2 frases sobre el precio>",
  "collectorNotes": "<2-4 frases en español sobre rareza/tiraje/interés coleccionable, sin repetir los datos ya conocidos; vacío si no hay nada nuevo que aportar>"
}`;

    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '';
    return { result: this.parseMarketPriceResponse(text, currency), usage: this.extractUsage(response) };
  }

  // El SDK expone el conteo de tokens en `response.usageMetadata`; si por
  // alguna razón no viene (ej. respuesta de error), se cuenta como 0 en vez de
  // reventar — el costo real es un dato informativo, nunca debe bloquear la
  // respuesta al usuario.
  private extractUsage(response: GenerateContentResponse): GeminiUsage {
    const meta = response.usageMetadata;
    return {
      promptTokens: meta?.promptTokenCount ?? 0,
      candidatesTokens: meta?.candidatesTokenCount ?? 0,
      totalTokens: meta?.totalTokenCount ?? 0,
    };
  }

  // Estimación de costo real en USD para el módulo FrikiTokens (ver constantes
  // de precio arriba). Puede llamarse desde otros módulos sin repetir la cuenta.
  static estimateCostUsd(usage: GeminiUsage): number {
    return (
      (usage.promptTokens / 1_000_000) * USD_PER_1M_INPUT_TOKENS +
      (usage.candidatesTokens / 1_000_000) * USD_PER_1M_OUTPUT_TOKENS
    );
  }

  private parseMarketPriceResponse(text: string, currency: string): MarketPriceResult {
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
      this.logger.error(`No se pudo parsear la respuesta de precio de mercado: ${text}`, error);
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
}
