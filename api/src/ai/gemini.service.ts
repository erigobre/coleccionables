import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  ItemCategory,
  PackagingCondition,
  UsageState,
  ConservationState,
} from '@prisma/client';
import type { ExtractedItemData, ImageInput, MarketPriceResult } from './ai.types.js';

const MODEL = 'gemini-flash-latest';

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
  },
  required: ['suggestedTags'],
};

const ANALYZE_PROMPT = `Eres un experto catalogador de coleccionables (juguetes, art toys, estatuas, cómics, libros, figuras de acción).
Analiza las fotos adjuntas de un objeto coleccionable y extrae la información estructurada que puedas identificar con confianza.
Si no puedes determinar un campo con certeza, omítelo (no inventes datos).
Siempre incluye en "suggestedTags" al menos un intento de identificar el color principal del objeto, y si reconoces la franquicia/personaje, inclúyela también como tag.
Responde únicamente con el JSON solicitado.`;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async analyzePhotos(photos: ImageInput[]): Promise<ExtractedItemData> {
    const imageParts = photos.map((photo) => ({
      inlineData: { data: photo.buffer.toString('base64'), mimeType: photo.mimetype },
    }));

    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: ANALYZE_PROMPT }, ...imageParts] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: ITEM_SCHEMA,
      },
    });

    const text = response.text ?? '{}';
    try {
      const parsed = JSON.parse(text) as Partial<ExtractedItemData>;
      return { suggestedTags: [], ...parsed };
    } catch (error) {
      this.logger.error(`No se pudo parsear la respuesta de análisis de IA: ${text}`, error);
      return { suggestedTags: [] };
    }
  }

  // Nota: la API de Gemini no permite combinar `responseSchema` (modo JSON forzado)
  // con la herramienta `googleSearch` en la misma llamada, así que aquí se le pide
  // al modelo por prompt que responda ÚNICAMENTE con un JSON y se parsea de forma
  // tolerante (buscando el primer/último `{`/`}` del texto de respuesta).
  async lookupMarketPrice(itemDescription: string, currency: string): Promise<MarketPriceResult> {
    const prompt = `Busca el precio promedio actual de mercado (reventa/coleccionismo, no precio original de lista) para este objeto coleccionable:
"${itemDescription}"

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "averagePrice": <número en ${currency} o null si no lo encuentras>,
  "currency": "${currency}",
  "availability": "DISPONIBLE" | "AGOTADO" | "NO_EN_MERCADO",
  "purchaseLinks": [<URLs relevantes como strings, puede ser vacío>],
  "summary": "<resumen breve en español de 1-2 frases>"
}`;

    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '';
    return this.parseMarketPriceResponse(text, currency);
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
      };
    } catch (error) {
      this.logger.error(`No se pudo parsear la respuesta de precio de mercado: ${text}`, error);
      return {
        averagePrice: null,
        currency,
        availability: 'NO_EN_MERCADO',
        purchaseLinks: [],
        summary: text.trim() || 'No se pudo determinar el precio de mercado.',
      };
    }
  }
}
