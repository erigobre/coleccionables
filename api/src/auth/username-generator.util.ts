import { isUsernameProfane } from './profanity/username-filter.js';

// A partir de hoy el @usuario es obligatorio para TODA cuenta (decisión del
// usuario 2026-10-17): los flujos que crean un usuario sin pedir @usuario en
// el formulario (ver organizations.service.ts, alta de familiares) deben
// autogenerar uno a partir del nombre, igual que ya hacen otros sistemas con
// la "autopropuesta". Mismo formato que exige RegisterDto: [a-z0-9_]{3,20}.
function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);
  return base.length >= 3 ? base : `${base}user`.slice(0, 15);
}

export async function generateUsernameFromName(
  name: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let base = slugify(name);
  if (isUsernameProfane(base)) {
    base = 'usuario';
  }

  if (!(await isTaken(base))) {
    return base;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    const candidate = `${base}${suffix}`.slice(0, 20);
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  // Última salida si 20 intentos aleatorios chocan (prácticamente imposible):
  // garantiza unicidad con un timestamp.
  return `user${Date.now()}`.slice(0, 20);
}
