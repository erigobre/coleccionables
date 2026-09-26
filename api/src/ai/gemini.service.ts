import { Injectable, Logger } from '@nestjs/common';
import {
  FinishReason,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  HarmProbability,
  Type,
  type GenerateContentResponse,
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
  BoundingBox,
  ExtractedItemData,
  GeminiCallResult,
  GeminiUsage,
  ImageInput,
  MarketPriceResult,
  ModerationSignal,
  VisualCompareResult,
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

// Antes se forzaba la forma de la respuesta con `responseSchema`, pero eso es
// incompatible con la herramienta `googleSearch` (no se pueden combinar en la
// misma llamada — ver lookupBarcode/lookupMarketPrice). Para poder buscar el
// producto en la web y así identificarlo con más precisión, se le pide al
// modelo por prompt que responda ÚNICAMENTE con un JSON con esta forma y se
// parsea de forma tolerante (parseAnalyzeResponse).
const ANALYZE_PROMPT = `Eres un experto catalogador de coleccionables (juguetes, art toys, estatuas, cómics, libros, figuras de acción, esculturas, pinturas).

Analiza las fotos adjuntas de un objeto coleccionable. Usa la búsqueda web para identificar el producto exacto (franquicia, línea, edición, fabricante, año, número de set, precio de referencia) en vez de limitarte solo a lo que se ve en la imagen — como harías si buscaras este producto para comprarlo o venderlo.

Responde a cada uno de estos campos. Es preferible arriesgar una respuesta razonable (y que el usuario la corrija si hace falta) a dejar el campo vacío: solo omite un campo si de verdad no hay forma de estimarlo ni con la imagen ni con la búsqueda.

- "name": nombre del objeto tal como se vendería (marca + línea + personaje/modelo).
- "category": EXACTAMENTE uno de estos valores (usa el código, no la etiqueta): LIBRO (Libro), COMIC (Cómic), ART_TOY (Art Toy), ESTATUA (Estatua), FIGURA_ACCION (Figura de acción), JUGUETE (Juguete), ESCULTURA (Escultura), PINTURA (Pintura), OTRO (Otro).
- "packagingCondition": EXACTAMENTE uno de: SUELTO (sin caja/empaque), BLISTER_SELLADO (blister o caja sellada sin abrir), BLISTER_ABIERTO (blister o caja ya abierta), CON_CAJA_SIN_BLISTER (tiene caja pero no blister). Básate en lo que se ve en la foto.
- "usageState": EXACTAMENTE uno de: NUEVO, USADO, ABIERTO. Básate en lo que se ve en la foto.
- "conservationState": EXACTAMENTE uno de: MINT (perfecto estado), NEAR_MINT (casi perfecto, defectos mínimos), BUEN_ESTADO (uso visible pero cuidado), CON_DETALLES (daños o desgaste notorio). Evalúa el estado físico visible en la foto.
- "brand": marca o fabricante (ej. Hasbro, Funko, McFarlane Toys, Marvel Comics).
- "toyLine": línea de juguete, serie o modelo.
- "edition": edición o variante (ej. "Edición limitada", "Exclusivo SDCC", "Chase").
- "scale": escala o altura (ej. "1:6", "18cm", "1/10").
- "designer": diseñador o artista, si el producto lo atribuye a alguien en particular.
- "releaseYear": año de lanzamiento original, como número.
- "originalSetNumber": número de set/modelo/SKU del fabricante impreso en la caja (no el código de barras EAN/UPC).
- "purchasePrice": precio de compra promedio actual de este producto (de reventa/segunda mano si es coleccionable, o precio de lista si sigue en venta como nuevo), como número EN PESOS MEXICANOS (MXN). Si la fuente que encuentres está en otra moneda (USD, EUR, etc.), conviértela a MXN usando el tipo de cambio aproximado actual antes de responder — nunca devuelvas el número en la moneda original.
- "collectorSummary": una sola frase en español (máximo 140 caracteres) dirigida al propio coleccionista, con el dato más interesante que encontraste sobre este objeto (rareza, tirada limitada, curiosidad de producción, por qué le importaría a un coleccionista). No repitas simplemente el nombre del objeto.
- Si la categoría es Cómic o Libro, además intenta: "comicCoverNumber", "comicIssueNumber", "comicWriter", "comicPenciler", "comicInker", "comicColorist", "comicPublisher".
- "suggestedTags": array de tags cortos en español. SIEMPRE incluye al menos el color principal del objeto, y si reconoces la franquicia/personaje inclúyela también como tag.
- "boundingBox": recuadro que encierra COMPLETO el objeto principal en la PRIMERA foto, como fracción del ancho/alto de esa imagen (0 a 1): {"xMin":, "yMin":, "xMax":, "yMax":}. Se usa para recortarlo después, así que abarca el objeto entero sin cortarlo pero sin incluir de más el fondo.

Además, evalúa las fotos para moderación de contenido (esto es tan importante como los datos del objeto):
- "isLikelyCollectible": true si las fotos muestran principalmente un objeto coleccionable; false si muestran otra cosa (una persona, un paisaje, un documento, una pantalla, etc.).
- "containsIdentifiablePerson": true SOLO si se ve el rostro de una persona real y reconocible (una fotografía de un ser humano de carne y hueso). Una figura de acción, muñeco, busto, estatua o arte que representa un rostro humano NO cuenta como persona real: en esos casos responde false.
- "moderationNote": si marcaste isLikelyCollectible en false o containsIdentifiablePerson en true, describe brevemente en español y de forma neutral qué se ve en la foto (para que un moderador humano lo entienda sin ver la imagen). Si no hay nada que señalar, deja este campo vacío.

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin explicaciones antes o después) con los campos de arriba.`;

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
        tools: [{ googleSearch: {} }],
        safetySettings: SAFETY_SETTINGS,
      },
    });

    const usage = this.extractUsage(response);
    const moderation = this.extractModerationSignal(response);
    const parsed = this.parseAnalyzeResponse(response.text ?? '');
    moderation.isLikelyCollectible = parsed.isLikelyCollectible;
    moderation.containsIdentifiablePerson = parsed.containsIdentifiablePerson;
    moderation.moderationNote = parsed.moderationNote;
    return { result: parsed.extracted, usage, moderation, boundingBox: parsed.boundingBox };
  }

  private parseAnalyzeResponse(text: string): {
    extracted: ExtractedItemData;
    isLikelyCollectible: boolean | null;
    containsIdentifiablePerson: boolean | null;
    moderationNote: string | null;
    boundingBox?: BoundingBox;
  } {
    const empty = {
      extracted: { suggestedTags: [] } as ExtractedItemData,
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

      return {
        extracted,
        isLikelyCollectible: typeof parsed.isLikelyCollectible === 'boolean' ? parsed.isLikelyCollectible : null,
        containsIdentifiablePerson:
          typeof parsed.containsIdentifiablePerson === 'boolean' ? parsed.containsIdentifiablePerson : null,
        moderationNote: str(parsed.moderationNote) ?? null,
        boundingBox: this.parseBoundingBox(parsed.boundingBox),
      };
    } catch (error) {
      this.logger.error(`No se pudo parsear la respuesta de análisis de IA: ${text}`, error);
      return empty;
    }
  }

  // Valida que el bounding box venga con las 4 fracciones 0-1 esperadas y con
  // el orden correcto (xMin < xMax, yMin < yMax); si algo no cuadra, se
  // descarta en vez de arriesgar un recorte incorrecto en StorageService.
  private parseBoundingBox(value: unknown): BoundingBox | undefined {
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

  // Compara visualmente la foto del objeto a identificar contra hasta 3
  // candidatos (avatares recortados de objetos ya guardados) etiquetados A, B,
  // C... A diferencia de analyzePhotos/lookupBarcode/lookupMarketPrice, esta
  // llamada NO necesita `googleSearch` (es pura comparación visual entre
  // imágenes ya dadas), así que sí puede usar `responseSchema` para forzar un
  // JSON válido — sin el parseo tolerante que necesitan los otros métodos.
  async compareCandidates(
    query: ImageInput,
    candidates: { label: string; image: ImageInput }[],
  ): Promise<GeminiCallResult<VisualCompareResult>> {
    const parts = [
      { text: 'Foto del objeto a identificar:' },
      { inlineData: { data: query.buffer.toString('base64'), mimeType: query.mimetype } },
      ...candidates.flatMap((candidate) => [
        { text: `Objeto candidato ${candidate.label}:` },
        { inlineData: { data: candidate.image.buffer.toString('base64'), mimeType: candidate.image.mimetype } },
      ]),
    ];

    const prompt = `Eres un experto en identificar coleccionables (juguetes, art toys, estatuas, figuras de acción, cómics) a partir de fotos.

Te doy una foto de un objeto a identificar y ${candidates.length} foto(s) de objetos candidatos (${candidates.map((c) => c.label).join(', ')}), cada uno ya guardado en el inventario de un coleccionista.

Para CADA candidato, evalúa qué tan probable es que sea el MISMO objeto físico exacto que el objeto a identificar (no solo el mismo modelo/línea genérica, sino la misma pieza: mismas proporciones, color, empaque, accesorios y detalles visibles). Da un puntaje de 0 a 100, donde 100 significa certeza absoluta de que es el mismo objeto y 0 significa que claramente no lo es. Sé estricto: diferencias de color, escala, edición o accesorios deben bajar mucho el puntaje aunque se trate del mismo personaje/franquicia.`;

    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }, ...parts] }],
      config: {
        safetySettings: SAFETY_SETTINGS,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: Object.fromEntries(
                candidates.map((candidate) => [candidate.label, { type: Type.NUMBER }]),
              ),
            },
          },
          required: ['scores'],
        },
      },
    });

    const usage = this.extractUsage(response);
    const result: VisualCompareResult = { scores: {} };
    try {
      const parsed = JSON.parse(response.text ?? '{}') as { scores?: Record<string, unknown> };
      for (const candidate of candidates) {
        const raw = parsed.scores?.[candidate.label];
        const score = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
        result.scores[candidate.label] = Math.min(100, Math.max(0, Math.round(score)));
      }
    } catch (error) {
      this.logger.error(`No se pudo parsear la respuesta de comparación visual: ${response.text}`, error);
      for (const candidate of candidates) result.scores[candidate.label] = 0;
    }

    return { result, usage };
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
