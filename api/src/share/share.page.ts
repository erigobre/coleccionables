// Página pública de un objeto compartido. Es HTML plano generado en el servidor:
// no requiere la app instalada (decisión #13). Todo texto que viene de la base de
// datos pasa por `esc` — el contenido lo escribe el dueño y se muestra a terceros.

export interface SharedItemView {
  name: string;
  category: string;
  status: string;
  packagingCondition: string;
  usageState: string;
  conservationState: string | null;
  brand: string | null;
  toyLine: string | null;
  edition: string | null;
  scale: string | null;
  designer: string | null;
  releaseYear: number | null;
  photoUrls: string[];
}

const LABELS: Record<string, Record<string, string>> = {
  category: {
    LIBRO: 'Libro',
    COMIC: 'Cómic',
    ART_TOY: 'Art Toy',
    ESTATUA: 'Estatua',
    FIGURA_ACCION: 'Figura de acción',
    JUGUETE: 'Juguete',
    ESCULTURA: 'Escultura',
    PINTURA: 'Pintura',
    OTRO: 'Otro',
  },
  packagingCondition: {
    SUELTO: 'Suelto',
    BLISTER_SELLADO: 'Blister sellado',
    BLISTER_ABIERTO: 'Blister abierto',
    CON_CAJA_SIN_BLISTER: 'Con caja (sin blister)',
  },
  usageState: { NUEVO: 'Nuevo', USADO: 'Usado', ABIERTO: 'Abierto' },
  conservationState: {
    MINT: 'Mint',
    NEAR_MINT: 'Near Mint',
    BUEN_ESTADO: 'Buen estado',
    CON_DETALLES: 'Con detalles',
  },
  status: { ACTIVE: 'En colección', PENDING_TRANSFER: 'En proceso de transferencia' },
};

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Solo se sirven fotos propias (/uploads/…): una URL arbitraria guardada en la base
// de datos no debe acabar como <img> en una página pública.
function safePhotos(urls: string[]): string[] {
  return urls.filter((u) => /^\/uploads\/[\w.-]+$/.test(u));
}

const STYLES = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#16122B;color:#F4EFE2;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.45}
  main{max-width:520px;margin:0 auto;padding:0 0 40px}
  .gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;background:#0F0C20}
  .gallery img{flex:0 0 100%;width:100%;aspect-ratio:1/1;object-fit:contain;scroll-snap-align:center}
  .empty{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#0F0C20;color:#8B84A8;font-size:56px}
  .body{padding:22px 20px}
  h1{margin:0 0 6px;font-size:26px;line-height:1.2}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#C6F432;color:#16122B;font-size:12px;font-weight:700}
  dl{margin:22px 0 0;display:grid;grid-template-columns:auto 1fr;gap:10px 16px}
  dt{color:#8B84A8;font-size:14px}
  dd{margin:0;font-size:15px}
  footer{margin-top:30px;padding:0 20px;text-align:center;color:#8B84A8;font-size:13px}
  footer strong{color:#C6F432;letter-spacing:.04em}
`;

// La CSP del controlador ya bloquea scripts y recursos externos; el estilo va inline.
function layout(title: string, head: string, content: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
${head}
<style>${STYLES}</style>
</head>
<body>
<main>
${content}
<footer>Compartido desde <strong>FRIKIDEX</strong> · el inventario de tu colección</footer>
</main>
</body>
</html>`;
}

export function renderSharedItemPage(item: SharedItemView, pageUrl: string, baseUrl: string): string {
  const photos = safePhotos(item.photoUrls);

  const rows: [string, string | null][] = [
    ['Categoría', LABELS.category[item.category] ?? null],
    ['Marca', item.brand],
    ['Línea', item.toyLine],
    ['Edición', item.edition],
    ['Escala', item.scale],
    ['Diseñador', item.designer],
    ['Año de producción', item.releaseYear ? String(item.releaseYear) : null],
    ['Empaque', LABELS.packagingCondition[item.packagingCondition] ?? null],
    ['Uso', LABELS.usageState[item.usageState] ?? null],
    ['Conservación', item.conservationState ? (LABELS.conservationState[item.conservationState] ?? null) : null],
  ];
  const details = rows
    .filter((row): row is [string, string] => !!row[1])
    .map(([label, value]) => `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`)
    .join('\n');

  const gallery = photos.length
    ? `<div class="gallery">${photos
        .map((url) => `<img src="${esc(url)}" alt="${esc(item.name)}" loading="lazy">`)
        .join('')}</div>`
    : `<div class="empty">📦</div>`;

  const description = [item.brand, item.toyLine, LABELS.category[item.category]].filter(Boolean).join(' · ');
  const head = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(item.name)}">`,
    `<meta property="og:description" content="${esc(description || 'Objeto de colección')}">`,
    `<meta property="og:url" content="${esc(pageUrl)}">`,
    photos[0] ? `<meta property="og:image" content="${esc(baseUrl + photos[0])}">` : '',
  ].join('\n');

  const content = `${gallery}
<div class="body">
<h1>${esc(item.name)}</h1>
<span class="badge">${esc(LABELS.status[item.status] ?? '')}</span>
<dl>
${details}
</dl>
</div>`;

  return layout(`${item.name} · Frikidex`, head, content);
}

export function renderNotAvailablePage(): string {
  return layout(
    'Enlace no disponible · Frikidex',
    '',
    `<div class="body" style="padding-top:80px;text-align:center">
<h1>Este enlace ya no está disponible</h1>
<p style="color:#8B84A8">El dueño dejó de compartir este objeto o ya no forma parte de su colección.</p>
</div>`,
  );
}
