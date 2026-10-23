import { Injectable, Logger } from '@nestjs/common';
import type {
  CollectibilityCheckResult,
  GeminiCallResult,
  GeminiUsage,
  ImageInput,
  MarketPriceResult,
  ModerationSignal,
} from './ai.types.js';
import { parseCollectibilityJson, parseMarketPriceJson } from './collectibility-parsing.util.js';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

// gpt-6-luna fue el modelo elegido tras benchmark 2026-10-22 comparando
// contra gpt-6.1-sol y Gemini: con tool_choice:"required" + detail:"high"
// fuerza una búsqueda web real (no permite que el modelo "alucine" un precio
// sin buscarlo) al costo más bajo de las opciones confiables probadas.
const MODEL = 'gpt-6-luna';

// Precios por 1M de tokens de gpt-6-luna en USD (ajustar si cambia la tarifa
// publicada por OpenAI). Solo para estimar el costo real y comparar contra lo
// cobrado en FrikiTokens — no afecta el cobro al usuario.
const USD_PER_1M_INPUT_TOKENS = 0.1;
const USD_PER_1M_OUTPUT_TOKENS = 0.5;

// La tarifa de la herramienta `web_search` en modelos de razonamiento está
// documentada como $10 por 1,000 llamadas, pero distintas fuentes de
// terceros no coinciden del todo con el detalle por variante de modelo — se
// usa como estimación razonable, no como cifra exacta (mismo criterio que ya
// usa gemini.service.ts para su propio costo de grounding).
const USD_PER_1000_WEB_SEARCH_CALLS = 10;

// Mismo contrato de campos que COLLECTIBILITY_PROMPT en gemini.service.ts
// (ver ai.types.ts: CollectibilityCheckResult) — se porta tal cual para que
// el parseo compartido (collectibility-parsing.util.ts) sirva para ambos
// proveedores sin cambios.
const COLLECTIBILITY_PROMPT = `Eres un experto catalogador de coleccionables (juguetes, art toys, estatuas, cómics, libros, figuras de acción, esculturas, pinturas).

Analiza las fotos adjuntas de un objeto coleccionable. Usa la búsqueda web para identificar el producto exacto (franquicia, línea, edición, fabricante, año, número de set) en vez de limitarte solo a lo que se ve en la imagen.

Responde a cada uno de estos campos de identificación. Es preferible arriesgar una respuesta razonable (y que el usuario la corrija si hace falta) a dejar el campo vacío: solo omite un campo si de verdad no hay forma de estimarlo ni con la imagen ni con la búsqueda. Si no logras identificar el objeto con ninguna confianza razonable, deja "name" vacío/ausente y deja el resto de los campos de identificación y de mercado igualmente vacíos — no inventes una identificación.

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
- "purchasePrice": precio de LANZAMIENTO/ORIGINAL (lo que costaba nuevo cuando salió a la venta, NO el precio actual de reventa), como número EN PESOS MEXICANOS (MXN). Convierte a MXN si la fuente está en otra moneda. Este campo es distinto de "currentMarket.averagePrice" (ver abajo).
- "collectorSummary": una sola frase en español (máximo 140 caracteres) con el dato más interesante que encontraste sobre este objeto.
- Si la categoría es Cómic o Libro, además intenta: "comicCoverNumber", "comicIssueNumber", "comicWriter", "comicPenciler", "comicInker", "comicColorist", "comicPublisher".
- "suggestedTags": array de tags cortos en español. SIEMPRE incluye al menos el color principal del objeto, y si reconoces la franquicia/personaje inclúyela también como tag.
- "boundingBox": recuadro que encierra COMPLETO el objeto principal en la PRIMERA foto, como fracción del ancho/alto de esa imagen (0 a 1): {"xMin":, "yMin":, "xMax":, "yMax":}.

Además, califica qué tan coleccionable es este objeto:
- "collectibilityStars": número ENTERO de 0 a 5 (0 = nada coleccionable/sin valor de colección, 5 = extremadamente coleccionable/muy buscado), según rareza, demanda, tirada limitada, estado de descontinuación y relevancia cultural.
- "collectibilityExplanation": párrafo en español explicando por qué le diste esa calificación y qué lo hace (o no) interesante para un coleccionista.

Y busca el precio ACTUAL de mercado (reventa/coleccionismo, no el de lanzamiento):
- "currentMarket": objeto con esta forma exacta: {"averagePrice": <número en MXN o null si no lo encuentras>, "currency": "MXN", "availability": "DISPONIBLE" | "AGOTADO" | "NO_EN_MERCADO", "purchaseLinks": [<URLs relevantes como strings, puede ser vacío>], "summary": "<resumen breve en español de 1-2 frases sobre el precio actual>", "collectorNotes": "<2-4 frases en español sobre rareza/tiraje/interés coleccionable>"}.

Además, evalúa las fotos para moderación de contenido (esto es tan importante como los datos del objeto):
- "isLikelyCollectible": true si las fotos muestran principalmente un objeto que alguien podría razonablemente coleccionar como hobby — esto INCLUYE plantas (bonsáis, cactus, suculentas, etc.), animales/mascotas de colección, monedas, estampillas y cualquier otro objeto físico coleccionable, no solo juguetes o art toys. Responde false SOLO si la foto muestra claramente algo que no es un objeto físico de colección (una persona, un paisaje sin objeto identificable, un documento, una pantalla, etc.).
- "containsIdentifiablePerson": true SOLO si se ve el rostro de una persona real y reconocible (una fotografía de un ser humano de carne y hueso). Una figura de acción, muñeco, busto, estatua o arte que representa un rostro humano NO cuenta como persona real: en esos casos responde false.
- "moderationNote": si marcaste isLikelyCollectible en false o containsIdentifiablePerson en true, describe brevemente en español y de forma neutral qué se ve en la foto. Si no hay nada que señalar, deja este campo vacío.

Responde ÚNICAMENTE con un objeto JSON (sin texto adicional, sin markdown, sin explicaciones antes o después) con los campos de arriba.`;

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly apiKey = process.env.OPENAI_API_KEY;

  async analyzeCollectibility(photos: ImageInput[]): Promise<GeminiCallResult<CollectibilityCheckResult>> {
    const imageParts = photos.map((photo) => ({
      type: 'input_image' as const,
      image_url: `data:${photo.mimetype};base64,${photo.buffer.toString('base64')}`,
      detail: 'high' as const,
    }));

    const json = await this.callResponsesApi([
      {
        role: 'user',
        content: [{ type: 'input_text', text: COLLECTIBILITY_PROMPT }, ...imageParts],
      },
    ]);

    const usage = this.extractUsage(json);
    const { text, refused } = this.extractOutputText(json);
    const moderation = this.extractModerationSignal(refused);
    const parsed = parseCollectibilityJson(text);
    moderation.isLikelyCollectible = parsed.isLikelyCollectible;
    moderation.containsIdentifiablePerson = parsed.containsIdentifiablePerson;
    moderation.moderationNote = parsed.moderationNote;
    return { result: parsed.result, usage, moderation, boundingBox: parsed.boundingBox };
  }

  // Mismo contrato de prompt/respuesta que GeminiService.lookupMarketPrice —
  // se porta tal cual para que items.service.ts no necesite cambios además
  // de qué servicio invoca.
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

    const json = await this.callResponsesApi([{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]);
    const usage = this.extractUsage(json);
    const { text } = this.extractOutputText(json);
    return { result: parseMarketPriceJson(text, currency), usage };
  }

  private async callResponsesApi(input: unknown): Promise<any> {
    if (!this.apiKey) throw new Error('Falta OPENAI_API_KEY en el entorno');

    const res = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        input,
        tools: [{ type: 'web_search' }],
        tool_choice: 'required',
      }),
      signal: AbortSignal.timeout(150_000),
    });

    const json = await res.json();
    if (!res.ok) {
      this.logger.error(`Error de OpenAI Responses API (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 800)}`);
      throw new Error(`OpenAI respondió HTTP ${res.status}`);
    }
    return json;
  }

  private extractOutputText(json: any): { text: string; refused: string | null } {
    const message = (json.output ?? []).find((item: any) => item.type === 'message');
    const content = message?.content ?? [];
    const textItem = content.find((item: any) => item.type === 'output_text');
    const refusalItem = content.find((item: any) => item.type === 'refusal');
    return { text: textItem?.text ?? '', refused: refusalItem?.refusal ?? null };
  }

  // OpenAI no expone un clasificador de seguridad separado del propio modelo
  // (a diferencia de Gemini, que da safetyRatings/blockReason independientes
  // del contenido generado) — la única señal equivalente disponible es que el
  // propio modelo se niegue a responder (`type: "refusal"`). Se usa como
  // proxy de `blockedByGoogleSafety` (nombre de campo conservado: es un gate
  // booleano genérico en ai.types.ts/items.service.ts, no específico de
  // Google) para no perder el auto-bloqueo de cuenta ante contenido inseguro.
  private extractModerationSignal(refused: string | null): ModerationSignal {
    return {
      blockedByGoogleSafety: !!refused,
      blockedCategories: refused ? ['openai:refusal'] : [],
      isLikelyCollectible: null,
      containsIdentifiablePerson: null,
      moderationNote: null,
    };
  }

  private extractUsage(json: any): GeminiUsage {
    const groundingQueries = (json.output ?? []).filter((item: any) => item.type === 'web_search_call').length;
    return {
      promptTokens: json.usage?.input_tokens ?? 0,
      candidatesTokens: json.usage?.output_tokens ?? 0,
      totalTokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0),
      groundingQueries,
      modelVersion: json.model,
    };
  }

  static estimateCostUsd(usage: GeminiUsage): number {
    return (
      (usage.promptTokens / 1_000_000) * USD_PER_1M_INPUT_TOKENS +
      (usage.candidatesTokens / 1_000_000) * USD_PER_1M_OUTPUT_TOKENS +
      (usage.groundingQueries / 1000) * USD_PER_1000_WEB_SEARCH_CALLS
    );
  }
}
