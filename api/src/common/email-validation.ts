import { getPublicSuffix } from 'tldts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TLDs comunes contra los que se compara un dominio "raro" para sugerir un
// arreglo (ej. alguien escribió ".con" en vez de ".com"). No es la lista
// completa de la IANA — tldts ya valida contra esa vía `getPublicSuffix` — es
// solo el universo de sugerencias razonables cuando el TLD escrito no existe.
const COMMON_TLDS = ['com', 'com.mx', 'net', 'org', 'mx', 'es', 'io', 'co', 'info', 'mx.com'];
const MAX_SUGGESTION_DISTANCE = 2;

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dist[i][j] = dist[i - 1][j - 1];
      } else {
        dist[i][j] = 1 + Math.min(dist[i - 1][j], dist[i][j - 1], dist[i - 1][j - 1]);
      }
    }
  }
  return dist[rows - 1][cols - 1];
}

export interface EmailValidationResult {
  structureValid: boolean;
  tldValid: boolean;
  suggestion: string | null;
}

// Valida estructura (regex simple) y que el TLD sea real (vía la Public
// Suffix List que trae `tldts`, que sí distingue ".com.mx" válido de
// ".com.mxx" inválido). Si el TLD no existe, busca el más parecido en
// COMMON_TLDS para sugerir la corrección completa del correo.
export function validateEmailDomain(email: string): EmailValidationResult {
  const structureValid = EMAIL_PATTERN.test(email);
  if (!structureValid) {
    return { structureValid, tldValid: false, suggestion: null };
  }

  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  const publicSuffix = getPublicSuffix(domain);
  if (publicSuffix) {
    return { structureValid, tldValid: true, suggestion: null };
  }

  const writtenSuffix = domain.split('.').slice(1).join('.');
  let bestSuggestionTld: string | null = null;
  let bestDistance = MAX_SUGGESTION_DISTANCE + 1;
  for (const candidate of COMMON_TLDS) {
    const distance = levenshtein(writtenSuffix, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSuggestionTld = candidate;
    }
  }

  if (bestSuggestionTld && bestDistance <= MAX_SUGGESTION_DISTANCE) {
    const localPart = domain.split('.')[0];
    const suggestedEmail = `${email.slice(0, email.lastIndexOf('@') + 1)}${localPart}.${bestSuggestionTld}`;
    return { structureValid, tldValid: false, suggestion: suggestedEmail };
  }

  return { structureValid, tldValid: false, suggestion: null };
}
