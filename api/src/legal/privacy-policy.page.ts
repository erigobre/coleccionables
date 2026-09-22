// Borrador inicial de política de privacidad (Fase 11 del plan maestro la marca
// como pendiente de revisión legal) — necesaria ya mismo para poder crear la
// ficha de la app en Google Play / App Store Connect. Contenido honesto sobre
// lo que la app realmente hace hoy; conviene que un abogado la revise antes
// del lanzamiento público definitivo.

const UPDATED_AT = '22 de septiembre de 2026';
const CONTACT_EMAIL = 'iamkikelo@gmail.com';

const STYLES = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#16122B;color:#F4EFE2;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.55}
  main{max-width:720px;margin:0 auto;padding:40px 20px 60px}
  h1{font-size:28px;margin:0 0 6px}
  .updated{color:#8B84A8;font-size:14px;margin:0 0 32px}
  h2{font-size:19px;color:#C6F432;margin:32px 0 10px}
  p,li{font-size:15px;color:#E7E1D3}
  ul{padding-left:20px}
  a{color:#C6F432}
  footer{margin-top:40px;padding-top:20px;border-top:1px solid #2A2447;text-align:center;color:#8B84A8;font-size:13px}
  footer strong{color:#C6F432;letter-spacing:.04em}
`;

export function renderPrivacyPolicyPage(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Política de privacidad · Frikidex</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<h1>Política de privacidad de Frikidex</h1>
<p class="updated">Última actualización: ${UPDATED_AT}</p>

<p>Frikidex es una aplicación para catalogar tu colección de objetos coleccionables (figuras, cómics, juguetes, arte, etc.). Esta política explica qué información recolectamos, para qué la usamos y qué control tienes sobre ella.</p>

<h2>1. Datos que recolectamos</h2>
<ul>
<li><strong>Datos de cuenta:</strong> nombre, nombre de usuario, correo electrónico y contraseña (guardada siempre cifrada, nunca en texto plano).</li>
<li><strong>Contenido que tú creas:</strong> objetos, colecciones, ubicaciones, temporadas, etiquetas y notas que registras dentro de tu inventario.</li>
<li><strong>Fotos de tus objetos:</strong> las fotos que tomas o subes de tus coleccionables, usadas para mostrarlas en tu inventario y, si lo solicitas, para que una IA (Google Gemini) identifique el objeto o busque su precio de mercado.</li>
<li><strong>Datos de uso:</strong> eventos como inicios de sesión o número de análisis con IA realizados, usados para estadísticas internas y para aplicar límites de uso justo (FrikiTokens).</li>
<li><strong>Información técnica básica:</strong> la que se genera automáticamente al usar cualquier API (dirección IP, fecha/hora de la solicitud), solo con fines de seguridad y diagnóstico.</li>
</ul>

<h2>2. Cómo usamos tus datos</h2>
<ul>
<li>Para operar las funciones principales de la app: guardar tu colección, mostrarla, y permitirte organizarla.</li>
<li>Para el análisis de fotos por IA y la búsqueda de precio de mercado, cuando tú decides usar esas funciones — las fotos correspondientes se envían a la API de Google Gemini únicamente para ese propósito.</li>
<li>Para prevenir abuso: si una foto analizada es marcada por los filtros de seguridad de Google como contenido explícito o inapropiado, la cuenta puede suspenderse automáticamente y el incidente queda en una cola de revisión interna.</li>
<li><strong>No vendemos tus datos a terceros ni los usamos para publicidad.</strong></li>
</ul>

<h2>3. Contenido compartido por ti</h2>
<p>Si decides generar un enlace público para un objeto ("Compartir enlace"), cualquier persona con ese enlace podrá ver la información y fotos de ese objeto, hasta que lo desactives. Si transfieres un objeto a otro usuario de Frikidex, ese usuario podrá ver la información del objeto transferido.</p>

<h2>4. FrikiTokens</h2>
<p>FrikiTokens es una moneda virtual dentro de la app que limita el uso de funciones de IA. No representa dinero real ni tiene valor de canje fuera de la aplicación.</p>

<h2>5. Con quién compartimos información</h2>
<p>Usamos proveedores externos únicamente como parte técnica del servicio, nunca para venderles tus datos:</p>
<ul>
<li><strong>Google Gemini API:</strong> procesa las fotos que envías a analizar o a buscar precio de mercado.</li>
<li><strong>Infraestructura de hospedaje:</strong> donde vive la base de datos y los servidores de la aplicación.</li>
</ul>

<h2>6. Tus derechos</h2>
<p>Puedes solicitar en cualquier momento la eliminación de tu cuenta y de todos tus datos escribiendo a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Atenderemos la solicitud en un plazo razonable.</p>

<h2>7. Menores de edad</h2>
<p>Frikidex no está dirigida a menores de 13 años y no recolectamos intencionalmente datos de menores de esa edad.</p>

<h2>8. Cambios a esta política</h2>
<p>Si esta política cambia, actualizaremos la fecha al inicio de esta página.</p>

<h2>9. Contacto</h2>
<p>Para preguntas sobre esta política o tus datos: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>

<footer>Compartido desde <strong>FRIKIDEX</strong> · el inventario de tu colección</footer>
</main>
</body>
</html>`;
}
