// Algoritmo de similitud v1 (plan §7.2): reglas ponderadas, sin embeddings.
// V2 futuro: similitud semántica real vía embeddings de texto/imagen.

export interface SimilarityCandidate {
  name?: string | null;
  brand?: string | null;
  toyLine?: string | null;
  category?: string | null;
  tags?: string[];
}

const WEIGHT_NAME_EXACT = 5;
const WEIGHT_NAME_PARTIAL = 2;
const WEIGHT_BRAND = 3;
const WEIGHT_TOY_LINE = 3;
const WEIGHT_CATEGORY = 1;
const WEIGHT_TAG = 1;
const MAX_TAG_SCORE = 3;

// A partir de este score se considera un "match" fuerte para ¿ya lo tengo?
export const STRONG_MATCH_THRESHOLD = 5;
// Por debajo de este score no se muestra en absoluto (ni como "similar").
export const MIN_DISPLAY_THRESHOLD = 1;

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function computeSimilarityScore(a: SimilarityCandidate, b: SimilarityCandidate): number {
  let score = 0;

  const nameA = normalize(a.name);
  const nameB = normalize(b.name);
  if (nameA && nameB) {
    if (nameA === nameB) {
      score += WEIGHT_NAME_EXACT;
    } else if (nameA.includes(nameB) || nameB.includes(nameA)) {
      score += WEIGHT_NAME_PARTIAL;
    }
  }

  if (normalize(a.brand) && normalize(a.brand) === normalize(b.brand)) {
    score += WEIGHT_BRAND;
  }

  if (normalize(a.toyLine) && normalize(a.toyLine) === normalize(b.toyLine)) {
    score += WEIGHT_TOY_LINE;
  }

  if (normalize(a.category) && normalize(a.category) === normalize(b.category)) {
    score += WEIGHT_CATEGORY;
  }

  const tagsA = new Set((a.tags ?? []).map(normalize));
  const tagsB = new Set((b.tags ?? []).map(normalize));
  let tagMatches = 0;
  for (const tag of tagsA) {
    if (tag && tagsB.has(tag)) tagMatches += 1;
  }
  score += Math.min(tagMatches * WEIGHT_TAG, MAX_TAG_SCORE);

  return score;
}

function nameTokens(value?: string | null): Set<string> {
  return new Set(
    normalize(value)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
}

// ¿Podrían ser el mismo objeto? Marca + línea + categoría suman score de sobra
// (7) aunque sean figuras distintas, así que "ya lo tengo" exige además que los
// nombres se parezcan. La IA y el usuario no escriben igual ("Funko Pop Darth
// Vader" vs "Darth Vader Funko"), por eso se comparan palabras, no el texto.
// Es deliberadamente estricta: decir "ya lo tienes" por error es peor que mostrarlo
// como "similar".
export function namesOverlap(a?: string | null, b?: string | null): boolean {
  const tokensA = nameTokens(a);
  const tokensB = nameTokens(b);
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  // Jaccard: "Hot Wheels Camaro" vs "Hot Wheels Mustang" comparten marca, no objeto.
  return shared / (tokensA.size + tokensB.size - shared) >= 0.6;
}
