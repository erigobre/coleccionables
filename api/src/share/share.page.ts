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
  saleStatus: 'FOR_SALE' | 'RESERVED' | 'SOLD' | null;
  salePrice: number | null; // ya viene en null cuando está vendido
  currency: string;
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

// Dominio de producción: el mismo que usan canonical/og:url en api/public/index.html.
const FRIKIDEX_URL = 'https://frikidex.com';

const LOGO_SVG = `<svg viewBox="0 0 120 120" role="img" aria-label="Frikidex"><rect width="120" height="120" rx="28" fill="#6D4AFF"></rect><path d="M22 40 V30 Q22 22 30 22 H40 M80 22 H90 Q98 22 98 30 V40 M98 80 V90 Q98 98 90 98 H80 M40 98 H30 Q22 98 22 90 V80" fill="none" stroke="#C6F432" stroke-width="7" stroke-linecap="round"></path><text x="54" y="84" text-anchor="middle" font-family="Arial Black, sans-serif" font-weight="900" font-size="68" fill="#F5F0E6">F</text><path d="M88 52 L90.6 58.4 L97 61 L90.6 63.6 L88 70 L85.4 63.6 L79 61 L85.4 58.4 Z" fill="#C6F432"></path></svg>`;

// Logo + wordmark + slogan, igual que en la landing (api/public/index.html),
// como enlace a la web pública. Se usa en la cabecera (grande) y el pie (chico).
// En la cabecera el slogan se oculta (showSlogan=false) pero sigue ocupando su
// espacio (visibility:hidden en vez de display:none) para no mover el logo.
function brandLockup(size: number, showSlogan = true): string {
  const sloganStyle = showSlogan ? '' : ' style="visibility:hidden"';
  return `<a class="brand-link" href="${FRIKIDEX_URL}" target="_blank" rel="noopener">
  <span class="brand-logo" style="width:${size}px;height:${size}px">${LOGO_SVG}</span>
  <span class="brand-word">FRIKI<b>DEX</b></span>
  <small class="slogan"${sloganStyle}>La dex de tus coleccionables</small>
</a>`;
}

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

export interface SharedCollectionTile {
  id: string;
  name: string;
  photoUrl: string | null;
  saleStatus: 'FOR_SALE' | 'RESERVED' | 'SOLD' | null;
  salePrice: number | null;
  currency: string;
}

export interface SharedCollectionView {
  name: string;
  ownerUsername: string | null;
  tiles: SharedCollectionTile[];
}

const STYLES = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#16122B;color:#F4EFE2;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.45}
  main{max-width:520px;margin:0 auto;padding:0 0 40px}
  .gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;background:#0F0C20}
  .gallery img{flex:0 0 100%;width:100%;aspect-ratio:1/1;object-fit:contain;scroll-snap-align:center}
  .empty{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;background:#0F0C20;color:#8B84A8;font-size:56px}
  .sale{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 20px;font-weight:800;font-size:14px;letter-spacing:.06em;text-transform:uppercase}
  .sale .price{font-size:18px;letter-spacing:0}
  .sale-FOR_SALE{background:#C6F432;color:#16122B}
  .sale-RESERVED{background:#F5A524;color:#16122B}
  .sale-SOLD{background:#3B3560;color:#F4EFE2}
  .body{padding:22px 20px}
  h1{margin:0 0 6px;font-size:26px;line-height:1.2}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#C6F432;color:#16122B;font-size:12px;font-weight:700}
  dl{margin:22px 0 0;display:grid;grid-template-columns:auto 1fr;gap:10px 16px}
  dt{color:#8B84A8;font-size:14px}
  dd{margin:0;font-size:15px}
  header.top{display:flex;justify-content:center;padding-top:22px}
  .brand-link{display:flex;flex-direction:column;align-items:center;gap:7px;text-decoration:none}
  .brand-logo{display:block}
  .brand-logo svg{width:100%;height:100%;display:block}
  .brand-word{font-weight:800;font-size:19px;letter-spacing:.02em;color:#F4EFE2}
  .brand-word b{color:#C6F432;font-weight:800}
  .slogan{font-weight:500;font-size:9px;letter-spacing:.13em;color:#8B84A8;text-transform:uppercase}
  main.wide{max-width:640px}
  .col-head{padding:22px 20px 16px;text-align:center}
  .col-head h1{font-size:24px}
  .col-head p{margin:0;color:#8B84A8;font-size:14px}
  .col-head p b{color:#C6F432;font-weight:700}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
  .tile{position:relative;display:block;aspect-ratio:1/1;background:#0F0C20;overflow:hidden}
  .tile img{width:100%;height:100%;object-fit:cover;display:block}
  .tile .ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8B84A8;font-size:34px}
  .tile .tag{position:absolute;left:0;right:0;bottom:0;padding:3px 6px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;display:flex;justify-content:space-between;gap:6px}
  .tile .tag-FOR_SALE{background:#C6F432;color:#16122B}
  .tile .tag-RESERVED{background:#F5A524;color:#16122B}
  .tile .tag-SOLD{background:#3B3560;color:#F4EFE2}
  .back{display:inline-block;margin:16px 20px 0;color:#C6F432;font-size:14px;font-weight:700;text-decoration:none}
  footer{margin-top:34px;padding:24px 20px 40px;text-align:center;color:#8B84A8;font-size:13px}
  footer .brand-link{margin-bottom:16px}
  footer a{color:#8B84A8;text-decoration:underline}
`;

// La CSP del controlador ya bloquea scripts y recursos externos; el estilo va inline.
function layout(title: string, head: string, content: string, wide = false): string {
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
<header class="top">${brandLockup(48, false)}</header>
<main${wide ? ' class="wide"' : ''}>
${content}
<footer>
${brandLockup(36)}
<small>Hecho por <a href="https://appgo.mx" target="_blank" rel="noopener">AppGo</a> © 2026</small><br>
<small><a href="/aviso-de-privacidad">Aviso de privacidad</a> · <a href="/condiciones-de-uso">Condiciones de uso</a></small>
</footer>
</main>
</body>
</html>`;
}

export function renderSharedItemPage(
  item: SharedItemView,
  pageUrl: string,
  baseUrl: string,
  backLink?: { url: string; label: string },
): string {
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

  const SALE_LABELS = { FOR_SALE: 'En venta', RESERVED: 'Apartado', SOLD: 'Vendido' } as const;
  const saleBanner = item.saleStatus
    ? `<div class="sale sale-${item.saleStatus}"><span>${SALE_LABELS[item.saleStatus]}</span>${
        item.salePrice !== null
          ? `<span class="price">$${esc(item.salePrice.toLocaleString('es-MX', { maximumFractionDigits: 2 }))} ${esc(item.currency)}</span>`
          : ''
      }</div>`
    : '';

  const back = backLink ? `<a class="back" href="${esc(backLink.url)}">${esc(backLink.label)}</a>` : '';

  const content = `${back}${saleBanner}${gallery}
<div class="body">
<h1>${esc(item.name)}</h1>
<span class="badge">${esc(LABELS.status[item.status] ?? '')}</span>
<dl>
${details}
</dl>
</div>`;

  return layout(`${item.name} · Frikidex`, head, content);
}

const SALE_TAG_LABELS = { FOR_SALE: 'En venta', RESERVED: 'Apartado', SOLD: 'Vendido' } as const;

// Cuadrícula tipo Instagram: 3 columnas de fotos cuadradas; cada una abre el objeto
// dentro del mismo enlace de la colección (`basePath/<id>`).
export function renderSharedCollectionPage(
  collection: SharedCollectionView,
  pageUrl: string,
  baseUrl: string,
  basePath: string,
): string {
  const tiles = collection.tiles
    .map((tile) => {
      const photo = tile.photoUrl && safePhotos([tile.photoUrl])[0];
      const image = photo
        ? `<img src="${esc(photo)}" alt="${esc(tile.name)}" loading="lazy">`
        : `<span class="ph">📦</span>`;
      const tag = tile.saleStatus
        ? `<span class="tag tag-${tile.saleStatus}"><span>${SALE_TAG_LABELS[tile.saleStatus]}</span>${
            tile.salePrice !== null
              ? `<span>$${esc(tile.salePrice.toLocaleString('es-MX', { maximumFractionDigits: 2 }))}</span>`
              : ''
          }</span>`
        : '';
      return `<a class="tile" href="${esc(`${basePath}/${tile.id}`)}" title="${esc(tile.name)}">${image}${tag}</a>`;
    })
    .join('');

  const count = collection.tiles.length;
  const owner = collection.ownerUsername ? `por <b>@${esc(collection.ownerUsername)}</b> · ` : '';
  const firstPhoto = collection.tiles.map((t) => t.photoUrl).find((u): u is string => !!u && safePhotos([u]).length > 0);
  const head = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(collection.name)}">`,
    `<meta property="og:description" content="${esc(`${count === 1 ? '1 objeto' : `${count} objetos`} en Frikidex`)}">`,
    `<meta property="og:url" content="${esc(pageUrl)}">`,
    firstPhoto ? `<meta property="og:image" content="${esc(baseUrl + firstPhoto)}">` : '',
  ].join('\n');

  const content = `<div class="col-head">
<h1>${esc(collection.name)}</h1>
<p>${owner}${count === 1 ? '1 objeto' : `${count} objetos`}</p>
</div>
${count ? `<div class="grid">
${tiles}
</div>` : `<p style="text-align:center;color:#8B84A8;padding:40px 20px">Esta colección todavía no tiene objetos.</p>`}`;

  return layout(`${collection.name} · Frikidex`, head, content, true);
}

export function renderNotAvailablePage(kind: 'item' | 'collection' = 'item'): string {
  return layout(
    'Enlace no disponible · Frikidex',
    '',
    `<div class="body" style="padding-top:80px;text-align:center">
<h1>Este enlace ya no está disponible</h1>
<p style="color:#8B84A8">${
      kind === 'collection'
        ? 'El dueño dejó de compartir esta colección o ya no está disponible.'
        : 'El dueño dejó de compartir este objeto o ya no forma parte de su colección.'
    }</p>
</div>`,
  );
}
