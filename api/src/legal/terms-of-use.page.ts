// Condiciones de uso — necesarias junto con la política de privacidad para el
// registro en frikidex.com y en la app, y para la ficha de la app en las
// tiendas. Conviene que un abogado la revise antes del lanzamiento público
// definitivo (mismo estatus que privacy-policy.page.ts).
//
// `TERMS_OF_USE_VERSION` se guarda en `users.termsVersionAccepted` en el
// momento del registro (ver api/src/auth/auth.service.ts).
export const TERMS_OF_USE_VERSION = '2026-09-23';
const UPDATED_AT = '23 de septiembre de 2026';
const CONTACT_EMAIL = 'iamkikelo@gmail.com';

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

export function renderTermsOfUsePage(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Condiciones de uso · Frikidex</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<h1>Condiciones de uso de Frikidex</h1>
<p class="updated">Última actualización: ${UPDATED_AT} · Versión ${TERMS_OF_USE_VERSION}</p>

<p>Estas condiciones rigen el uso de Frikidex, operada por <strong>${LEGAL_ENTITY_NAME}</strong> (RFC ${LEGAL_ENTITY_RFC}), con domicilio en ${LEGAL_ENTITY_ADDRESS}. Al crear una cuenta aceptas estas condiciones junto con la <a href="/privacidad">política de privacidad</a>.</p>

<h2>1. Qué son los FrikiTokens</h2>
<p>Los FrikiTokens (FT) son un crédito interno de uso, no monetario, que se consume al usar funciones de inteligencia artificial y otras funciones premium dentro de la app. Los FT <strong>no son dinero, no tienen valor de canje o reventa fuera de Frikidex, no son transferibles entre cuentas y no son reembolsables</strong> excepto cuando la ley aplicable lo exija o cuando una acción cobrada haya fallado (en cuyo caso se devuelven automáticamente a tu saldo).</p>

<h2>2. Vigencia y expiración de los FrikiTokens</h2>
<ul>
<li><strong>FT comprados</strong> (paquetes de un solo pago): no expiran.</li>
<li><strong>FT gratis del plan mensual:</strong> se otorgan una vez al mes y expiran al final de ese mismo mes si no se usan.</li>
<li><strong>FT de una suscripción activa:</strong> se acumulan mes a mes hasta un máximo de 2 meses de acumulación; el excedente por encima de ese límite se pierde al renovar.</li>
</ul>

<h2>3. Cambios de precio</h2>
<p>Podemos cambiar el costo en FT de una acción, o el precio de un paquete o plan, avisando con anticipación razonable dentro de la app o por correo. Un cambio de precio nunca afecta FT que ya compraste o que ya tenías en tu saldo.</p>

<h2>4. Suscripciones, renovación y cancelación</h2>
<p>Las suscripciones se renuevan automáticamente al final de cada periodo salvo que las canceles antes de esa fecha. La cancelación se gestiona desde la tienda de la plataforma donde contrataste (App Store o Google Play) o, si contrataste desde la web, desde tu cuenta o escribiendo a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Al cancelar, conservas el acceso hasta el final del periodo ya pagado.</p>

<h2>5. Reembolsos</h2>
<p>Si compraste desde App Store o Google Play, los reembolsos los gestiona esa tienda según su propia política. Si compraste directamente desde frikidex.com, aplicamos nuestra propia política de reembolso, que puedes consultar escribiendo a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Un reembolso resta los FT correspondientes de tu saldo si aún no se han usado.</p>

<h2>6. Identificación y precio de mercado por IA</h2>
<p>Las funciones de identificación de objetos y de precio de mercado usan inteligencia artificial y fuentes públicas como referencia. Son una <strong>estimación</strong>, no un avalúo formal ni un dictamen profesional, y no garantizamos su exactitud. No debes tomar decisiones de compra, venta o seguro basándote únicamente en estos resultados.</p>

<h2>7. Tu contenido</h2>
<p>Las fotos, descripciones y demás contenido que subes a tu inventario siguen siendo tuyos. Nos das permiso únicamente para almacenarlo, procesarlo (incluyendo el envío a Google Gemini cuando usas funciones de IA) y mostrártelo a ti, para poder ofrecerte el servicio.</p>

<h2>8. Suspensión de cuenta</h2>
<p>Podemos suspender o cancelar tu cuenta si: subes contenido que viole la ley, contenido explícito o inapropiado detectado por nuestros filtros de seguridad, intentas abusar del sistema de FrikiTokens o de las funciones de IA, o incumples de otra forma estas condiciones. Cuando sea posible, te avisaremos del motivo.</p>

<h2>9. Límite de responsabilidad</h2>
<p>Frikidex se ofrece "tal cual". En la medida que lo permita la ley, ${LEGAL_ENTITY_NAME} no es responsable por pérdidas indirectas derivadas del uso de la app, incluyendo decisiones tomadas con base en los resultados de las funciones de IA.</p>

<h2>10. Menores de edad</h2>
<p>Si eres menor de edad, necesitas el consentimiento de tu padre, madre o tutor para usar Frikidex; esa persona adulta acepta estas condiciones en tu nombre y es responsable de tu uso de la app.</p>

<h2>11. Cambios a estas condiciones</h2>
<p>Si estas condiciones cambian de forma relevante, actualizaremos la fecha y el número de versión al inicio de esta página, y te pediremos aceptarlas de nuevo cuando el cambio lo amerite.</p>

<h2>12. Contacto</h2>
<p>${LEGAL_ENTITY_NAME} · RFC ${LEGAL_ENTITY_RFC}<br>${LEGAL_ENTITY_ADDRESS}<br>Para preguntas sobre estas condiciones: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>

<footer>Compartido desde <strong>FRIKIDEX</strong> · el inventario de tu colección</footer>
</main>
</body>
</html>`;
}
