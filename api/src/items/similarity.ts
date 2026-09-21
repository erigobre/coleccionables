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
