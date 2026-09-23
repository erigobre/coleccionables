// Política de privacidad (Fase 11 del plan maestro la marca como pendiente de
// revisión legal) — necesaria para la ficha de la app en Google Play / App
// Store Connect y para el registro en frikidex.com. Contenido honesto sobre
// lo que la app realmente hace hoy; conviene que un abogado la revise antes
// del lanzamiento público definitivo.
//
// `PRIVACY_POLICY_VERSION` se guarda en `users.privacyVersionAccepted` en el
// momento del registro (ver api/src/auth/auth.service.ts) — cambia esta
// constante cada vez que el contenido cambie de forma relevante, para poder
// probar exactamente qué texto aceptó cada usuario.
export const PRIVACY_POLICY_VERSION = '2026-09-23';
const UPDATED_AT = '23 de septiembre de 2026';
const CONTACT_EMAIL = 'privacidad@appgo.mx';

const LEGAL_ENTITY_NAME = 'Aplicaciones y Soluciones Digitales GO';
const LEGAL_ENTITY_RFC = 'ASD1903057GA';
const LEGAL_ENTITY_ADDRESS =
  'Helena, Lote 4, Interior C4, Col. Jardines del Sur, Cancún, Benito Juárez, Quintana Roo, C.P. 77536, México';

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
<p class="updated">Última actualización: ${UPDATED_AT} · Versión ${PRIVACY_POLICY_VERSION}</p>

<p>Frikidex es una aplicación para catalogar tu colección de objetos coleccionables (figuras, cómics, juguetes, arte, etc.), operada por <strong>${LEGAL_ENTITY_NAME}</strong> (RFC ${LEGAL_ENTITY_RFC}), con domicilio en ${LEGAL_ENTITY_ADDRESS}. Esta política explica qué información recolectamos, para qué la usamos, dónde se guarda y qué control tienes sobre ella.</p>

<h2>1. Datos que recolectamos</h2>
<ul>
<li><strong>Datos de cuenta:</strong> nombre, nombre de usuario, correo electrónico y contraseña (guardada siempre cifrada, nunca en texto plano).</li>
<li><strong>Contenido que tú creas:</strong> objetos, colecciones, ubicaciones, temporadas, etiquetas y notas que registras dentro de tu inventario.</li>
<li><strong>Ubicaciones físicas de tu colección:</strong> si registras dónde guardas tus objetos (ej. "vitrina sala", "bodega"), ese dato se trata como sensible porque puede revelar dónde se encuentran bienes de valor — nunca se comparte públicamente ni se incluye en enlaces compartidos.</li>
<li><strong>Fotos de tus objetos:</strong> las fotos que tomas o subes de tus coleccionables, usadas para mostrarlas en tu inventario y, si lo solicitas, enviadas a la API de <strong>Google Gemini</strong> para identificar el objeto o buscar su precio de mercado.</li>
<li><strong>Datos de transacciones y suscripción:</strong> qué paquete de FrikiTokens o plan tienes activo y su historial de cambios. Los pagos en sí los procesan Apple, Google o Stripe (según el canal) — nosotros nunca vemos ni guardamos el número de tu tarjeta.</li>
<li><strong>Datos de uso y mejora del producto:</strong> eventos como inicios de sesión o número de análisis con IA realizados, usados para estadísticas internas, para aplicar límites de uso justo (FrikiTokens) y para decidir qué mejorar en la app.</li>
<li><strong>Información técnica básica:</strong> la que se genera automáticamente al usar cualquier API (dirección IP, fecha/hora de la solicitud), solo con fines de seguridad, prevención de abuso y diagnóstico.</li>
</ul>

<h2>2. Cómo usamos tus datos</h2>
<ul>
<li>Para operar las funciones principales de la app: guardar tu colección, mostrarla, y permitirte organizarla.</li>
<li>Para el análisis de fotos por IA y la búsqueda de precio de mercado, cuando tú decides usar esas funciones — las fotos correspondientes se envían a la API de Google Gemini únicamente para ese propósito.</li>
<li>Para prevenir abuso: si una foto analizada es marcada por los filtros de seguridad de Google como contenido explícito o inapropiado, la cuenta puede suspenderse automáticamente y el incidente queda en una cola de revisión interna.</li>
<li>Para procesar tus compras de FrikiTokens o tu suscripción, y para notificarte sobre su estado (renovación, cancelación, reembolso).</li>
<li>Para entender cómo se usa la app y mejorarla (analítica interna de producto).</li>
<li><strong>No vendemos tus datos a terceros ni los usamos para publicidad.</strong></li>
</ul>

<h2>3. Dónde se guardan tus datos y cuánto tiempo</h2>
<p>Tus datos se almacenan en servidores de nuestro proveedor de hospedaje, con posible tránsito a través de la infraestructura de Google (Gemini API) cuando usas funciones de IA — esto puede implicar transferencia de datos fuera de México, siempre bajo los mecanismos de protección que exigen esos proveedores. Conservamos tus datos mientras tu cuenta esté activa; si la eliminas, borramos la información asociada en un plazo razonable, salvo lo que debamos conservar por obligación legal o fiscal (ej. comprobantes de pago).</p>

<h2>4. Contenido compartido por ti</h2>
<p>Si decides generar un enlace público para un objeto ("Compartir enlace"), cualquier persona con ese enlace podrá ver la información y fotos de ese objeto (nunca su ubicación física), hasta que lo desactives. Si transfieres un objeto a otro usuario de Frikidex, ese usuario podrá ver la información del objeto transferido.</p>

<h2>5. FrikiTokens</h2>
<p>FrikiTokens es un crédito interno de uso dentro de la app que limita el uso de funciones de IA y algunas funciones premium. No representa dinero real, no es reembolsable ni transferible fuera de la aplicación — ver las <a href="/terminos">condiciones de uso</a> para los detalles de vigencia y expiración.</p>

<h2>6. Con quién compartimos información</h2>
<p>Usamos proveedores externos únicamente como parte técnica del servicio, nunca para venderles tus datos:</p>
<ul>
<li><strong>Google Gemini API:</strong> procesa las fotos que envías a analizar o a buscar precio de mercado.</li>
<li><strong>Apple, Google y Stripe:</strong> procesan los pagos de compras y suscripciones, según el canal que uses.</li>
<li><strong>Infraestructura de hospedaje:</strong> donde vive la base de datos y los servidores de la aplicación.</li>
</ul>

<h2>7. Tus derechos (ARCO)</h2>
<p>Como titular de tus datos personales, tienes derecho a <strong>Acceder</strong> a ellos, <strong>Rectificarlos</strong> si están desactualizados, <strong>Cancelarlos</strong> (eliminación) cuando consideres que no se requieren para las finalidades aquí descritas, y <strong>Oponerte</strong> a su uso para fines específicos. Para ejercer cualquiera de estos derechos, o para solicitar la eliminación completa de tu cuenta, escribe a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Atenderemos tu solicitud en un plazo razonable y, en cualquier caso, dentro de los plazos que marca la ley aplicable.</p>

<h2>8. Menores de edad</h2>
<p>Frikidex no está dirigida a menores de 13 años y no recolectamos intencionalmente datos de menores de esa edad. Si un menor de edad usa la app bajo supervisión de un adulto responsable, ese adulto acepta esta política en su nombre.</p>

<h2>9. Cambios a esta política</h2>
<p>Si esta política cambia de forma relevante, actualizaremos la fecha y el número de versión al inicio de esta página, y te pediremos aceptarla de nuevo si el cambio afecta cómo usamos tus datos.</p>

<h2>10. Contacto</h2>
<p>${LEGAL_ENTITY_NAME} · RFC ${LEGAL_ENTITY_RFC}<br>${LEGAL_ENTITY_ADDRESS}<br>Para preguntas sobre esta política o tus datos: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>

<footer>Compartido desde <strong>FRIKIDEX</strong> · el inventario de tu colección</footer>
</main>
</body>
</html>`;
}
