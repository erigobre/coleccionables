// Página pública exigida por Google Play ("Seguridad de los datos" → enlace
// de eliminación de cuenta): debe explicar, sin necesidad de instalar la app,
// cómo solicitar el borrado de la cuenta y qué datos se eliminan o conservan.
const UPDATED_AT = '21 de octubre de 2026';
const CONTACT_EMAIL = 'privacidad@appgo.mx';

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

export function renderAccountDeletionPage(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eliminar tu cuenta · Frikidex</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<h1>Cómo eliminar tu cuenta de Frikidex</h1>
<p class="updated">Última actualización: ${UPDATED_AT}</p>

<p>Puedes solicitar la eliminación de tu cuenta de <strong>Frikidex</strong> y de los datos asociados a ella en cualquier momento, directamente desde la app o por correo electrónico.</p>

<h2>Opción 1: desde la app</h2>
<ul>
<li>Abre Frikidex e inicia sesión.</li>
<li>Ve a <strong>Perfil → Ajustes → Eliminar cuenta</strong>.</li>
<li>Confirma la eliminación cuando la app te lo pida.</li>
</ul>

<h2>Opción 2: por correo electrónico</h2>
<p>Si no tienes acceso a la app, escribe a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> desde el correo asociado a tu cuenta, indicando que deseas eliminar tu cuenta de Frikidex. Verificaremos tu identidad y procesaremos la solicitud en un plazo razonable.</p>

<h2>Qué pasa después de solicitar la eliminación</h2>
<ul>
<li>Tu cuenta queda desactivada de inmediato: ya no podrás iniciar sesión de forma normal y dejará de ser encontrable por otros usuarios (por @usuario o correo) para invitaciones o transferencias.</li>
<li>Si inicias sesión de nuevo con tu contraseña dentro de los <strong>15 días</strong> siguientes, la cuenta se reactiva automáticamente.</li>
<li>Pasados los 15 días sin iniciar sesión, tu información personal (nombre, @usuario, correo, foto de perfil y contraseña) se anonimiza de forma permanente y deja de ser utilizable o identificable.</li>
</ul>

<h2>Qué datos se eliminan</h2>
<ul>
<li>Nombre, @usuario, correo electrónico, foto de perfil y contraseña.</li>
<li>Objetos, colecciones y ubicaciones que sigan siendo tuyos al momento del borrado (no transferidos a nadie más).</li>
</ul>

<h2>Qué datos se conservan y por cuánto tiempo</h2>
<ul>
<li><strong>Historial de compras y transacciones de FrikiTokens:</strong> se conserva de forma desasociada de tu identidad, por obligaciones fiscales y contables.</li>
<li><strong>Objetos que ya transferiste a otro usuario:</strong> permanecen en la cuenta de quien los recibió, ya que pasaron a ser de su propiedad antes de la eliminación.</li>
<li><strong>Registros técnicos de seguridad</strong> (ej. para prevención de abuso): se conservan el tiempo mínimo necesario según la ley aplicable.</li>
</ul>

<p>Para más detalle sobre el tratamiento de tus datos, consulta nuestra <a href="/privacidad">política de privacidad</a>.</p>

<footer>Compartido desde <strong>FRIKIDEX</strong> · el inventario de tu colección</footer>
</main>
</body>
</html>`;
}
