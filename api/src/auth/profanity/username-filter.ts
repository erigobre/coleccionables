import { BANNED_USERNAME_WORDS } from './banned-words.js';

// El username ya viene restringido a [a-z0-9_]{3,20} (ver RegisterDto/CheckUsernameDto),
// así que no hay acentos ni símbolos que normalizar salvo dígitos usados como
// leetspeak (p3nd3jo, put0) y guiones bajos como separador.
const LEETSPEAK_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
};

function normalize(username: string): string {
  const withoutSeparators = username.toLowerCase().replace(/_/g, '');
  const deLeeted = withoutSeparators
    .split('')
    .map((char) => LEETSPEAK_MAP[char] ?? char)
    .join('');
  // Colapsa repeticiones de 3+ (ej. "peeendejo") sin tocar dobles legítimas (rr, ll, cc).
  return deLeeted.replace(/(.)\1{2,}/g, '$1');
}

export function isUsernameProfane(username: string): boolean {
  const normalized = normalize(username);
  return BANNED_USERNAME_WORDS.some((word) => normalized.includes(word));
}
