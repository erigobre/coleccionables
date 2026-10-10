// Página pública (frikidex.com/recuperar-cuenta?email=...) enlazada desde el
// botón "¿No reconoces este cambio?" del correo de "tu contraseña cambió"
// (EmailService.sendPasswordChangedEmail). Deliberadamente en el navegador y
// no en la app (pedido explícito del dueño del producto, 2026-10-10): quien
// recibe el correo puede no tener la app a la mano o puede que sea justo la
// persona que SÍ la tiene quien le robó la cuenta. Un solo botón dispara el
// mismo /auth/forgot-password que ya existe — no hay un formulario de
// contraseña nuevo aquí, el código que llega se captura en la app (mismo
// flujo de "olvidé mi contraseña" en los dos casos, una sola pantalla que
// mantener).
const STYLES = `
:root{
  --violeta:#6D4AFF; --lima:#C6F432; --lima-2:#E2FF8A;
  --noche:#16122B; --noche-deep:#0F0C1F; --card:#221C3D; --elev:#2E2752;
  --txt:#F5F0E6; --txt-2:#CFC8E6; --txt-3:#A79FC4;
  --display:'Bungee',Impact,'Arial Black',sans-serif;
  --body:'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{margin:0;background:var(--noche);color:var(--txt);font-family:var(--body);font-size:16px;line-height:1.55}
main{max-width:560px;margin:0 auto;padding:48px 20px 64px}
a{color:var(--lima)}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-size:20px;margin-bottom:36px}
.brand svg{width:36px;height:36px;flex:0 0 36px}
h1{font-family:var(--display);font-weight:400;font-size:clamp(26px,6vw,36px);margin:0 0 10px}
.lead{color:var(--txt-2);margin:0 0 32px;max-width:56ch}
.card{background:var(--card);border-radius:20px;padding:28px;margin-bottom:24px}
.card p{color:var(--txt-2);margin:0;font-size:14px}
.email{color:var(--txt);font-weight:700}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;width:100%;padding:0 24px;
  border:none;border-radius:14px;font-family:var(--display);font-size:15px;cursor:pointer;text-transform:uppercase;
  background:var(--lima);color:var(--noche);box-shadow:0 5px 0 #8FB417;margin-top:8px;transition:transform .12s ease}
.btn:active{transform:translateY(2px)}
.btn[disabled]{background:var(--elev);color:var(--txt-3);box-shadow:none;cursor:not-allowed}
.msg{margin-top:14px;font-size:14px;min-height:20px}
.msg.ok{color:var(--lima)}
.msg.err{color:#FF6B57}
footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--elev);text-align:center;color:var(--txt-3);font-size:13px}
footer a{color:var(--txt-3)}
`;

export function renderAccountRecoveryPage(email: string | null): string {
  const safeEmail = email ? escapeHtml(email) : null;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recuperar tu cuenta — Frikidex</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/png" href="/assets/frikidex-icono-cuadrado.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=DM+Sans:wght@400;500;700&display=swap">
<style>${STYLES}</style>
</head>
<body>
<main>
  <a class="brand" href="/">
    <svg viewBox="0 0 120 120" role="img" aria-label="Frikidex">
      <rect width="120" height="120" rx="28" fill="#6D4AFF"></rect>
      <path d="M22 40 V30 Q22 22 30 22 H40 M80 22 H90 Q98 22 98 30 V40 M98 80 V90 Q98 98 90 98 H80 M40 98 H30 Q22 98 22 90 V80" fill="none" stroke="#C6F432" stroke-width="7" stroke-linecap="round"></path>
      <text x="54" y="84" text-anchor="middle" font-family="Bungee, sans-serif" font-size="68" fill="#F5F0E6">F</text>
    </svg>
    <span>FRIKI<span style="color:var(--lima)">DEX</span></span>
  </a>

  <h1>¿NO RECONOCES ESTE CAMBIO?</h1>
  <p class="lead">Si no fuiste tú quien cambió la contraseña, recupera tu cuenta ahora mismo. Te mandamos un código nuevo a tu correo para que vuelvas a entrar desde la app.</p>

  <div class="card">
    ${safeEmail ? `<p style="margin-bottom:16px">Cuenta: <span class="email">${safeEmail}</span></p>` : ''}
    <button class="btn" id="recoverBtn" type="button">Recuperar mi cuenta</button>
    <div class="msg" id="formMsg" role="status"></div>
  </div>

  <footer>
    <p><a href="/aviso-de-privacidad">Aviso de privacidad</a> · <a href="/soporte">Soporte</a></p>
    <p>Frikidex — hecho por <a href="https://appgo.mx" target="_blank" rel="noopener">AppGo</a></p>
  </footer>
</main>

<script>
(function(){
  var email = ${safeEmail ? JSON.stringify(email) : 'null'};
  var btn = document.getElementById('recoverBtn');
  var box = document.getElementById('formMsg');
  btn.addEventListener('click', function(){
    if(!email){ box.className = 'msg err'; box.textContent = 'Este enlace no trae un correo válido. Usa "Olvidé mi contraseña" desde la app.'; return; }
    btn.disabled = true;
    box.className = 'msg';
    box.textContent = 'Enviando…';
    fetch('/auth/forgot-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: email })
    }).then(function(r){ if(!r.ok) throw new Error('forgot_password_failed'); return r.json(); })
      .then(function(){
        box.className = 'msg ok';
        box.textContent = 'Listo. Si esa cuenta existe, le llegó un código a su correo — ábrelo desde la app en "Olvidé mi contraseña" para poner una contraseña nueva.';
      })
      .catch(function(){
        box.className = 'msg err';
        box.textContent = 'No pudimos procesar la solicitud, intenta de nuevo en un momento.';
        btn.disabled = false;
      });
  });
})();
</script>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
