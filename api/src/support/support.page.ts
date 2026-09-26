// Página pública de soporte (frikidex.com/soporte) — la URL que se registra
// como "support URL" en la ficha de Google Play / App Store Connect. Un
// formulario general que guarda la solicitud en BD (misma idea que
// api/src/waitlist/), no envía correo todavía (ver TODO en support.service.ts).
const CONTACT_EMAIL = 'privacidad@appgo.mx';

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
main{max-width:640px;margin:0 auto;padding:48px 20px 64px}
a{color:var(--lima)}
.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-size:20px;margin-bottom:36px}
.brand svg{width:36px;height:36px;flex:0 0 36px}
h1{font-family:var(--display);font-weight:400;font-size:clamp(26px,6vw,36px);margin:0 0 10px}
.lead{color:var(--txt-2);margin:0 0 32px;max-width:56ch}
.card{background:var(--card);border-radius:20px;padding:28px;margin-bottom:24px}
.card h2{font-size:15px;color:var(--lima);margin:0 0 8px;font-family:var(--body);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.card p{color:var(--txt-2);margin:0;font-size:14px}
label{display:block;font-size:13px;color:var(--txt-3);margin:16px 0 6px}
label:first-of-type{margin-top:0}
input,select,textarea{width:100%;background:var(--noche-deep);border:1px solid var(--elev);border-radius:12px;
  color:var(--txt);font-family:var(--body);font-size:15px;padding:12px 14px}
input:focus,select:focus,textarea:focus{outline:2px solid var(--violeta)}
textarea{min-height:120px;resize:vertical}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;width:100%;padding:0 24px;
  border:none;border-radius:14px;font-family:var(--display);font-size:15px;cursor:pointer;text-transform:uppercase;
  background:var(--lima);color:var(--noche);box-shadow:0 5px 0 #8FB417;margin-top:22px;transition:transform .12s ease}
.btn:active{transform:translateY(2px)}
.btn[disabled]{background:var(--elev);color:var(--txt-3);box-shadow:none;cursor:not-allowed}
.msg{margin-top:14px;font-size:14px;min-height:20px}
.msg.ok{color:var(--lima)}
.msg.err{color:#FF6B57}
footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--elev);text-align:center;color:var(--txt-3);font-size:13px}
footer a{color:var(--txt-3)}
`;

export function renderSupportPage(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Soporte — Frikidex</title>
<meta name="description" content="¿Tienes una duda, un problema o una sugerencia sobre Frikidex? Escríbenos desde este formulario y te respondemos por correo.">
<link rel="canonical" href="https://frikidex.com/soporte">
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

  <h1>¿EN QUÉ TE AYUDAMOS?</h1>
  <p class="lead">Cuéntanos tu duda, problema o sugerencia y te respondemos por correo a la dirección que nos dejes aquí abajo.</p>

  <form id="supportForm" novalidate>
    <label for="name">Tu nombre</label>
    <input type="text" id="name" name="name" maxlength="120" required>

    <label for="email">Tu correo</label>
    <input type="email" id="email" name="email" placeholder="tu@correo.com" required>

    <label for="category">¿Sobre qué es?</label>
    <select id="category" name="category">
      <option value="cuenta">Mi cuenta o mis datos</option>
      <option value="pagos">Pagos o FrikiTokens</option>
      <option value="error">Reportar un error</option>
      <option value="sugerencia">Una sugerencia</option>
      <option value="otro" selected>Otro</option>
    </select>

    <label for="message">Cuéntanos con detalle</label>
    <textarea id="message" name="message" maxlength="2000" required></textarea>

    <input class="hp" type="text" id="website" name="website" autocomplete="off" tabindex="-1" aria-hidden="true">

    <button class="btn" type="submit">Enviar</button>
    <div class="msg" id="formMsg" role="status"></div>
  </form>

  <div class="card" style="margin-top:32px">
    <h2>¿Es sobre tus datos personales?</h2>
    <p>Para ejercer tus derechos ARCO o pedir la eliminación de tu cuenta, escribe directo a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> — así lo atendemos más rápido.</p>
  </div>

  <footer>
    <p><a href="/aviso-de-privacidad">Aviso de privacidad</a> · <a href="/condiciones-de-uso">Condiciones de uso</a></p>
    <p>Frikidex — hecho por <a href="https://appgo.mx" target="_blank" rel="noopener">AppGo</a></p>
  </footer>
</main>

<script>
(function(){
  function ok(mail){ return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(mail); }
  var form = document.getElementById('supportForm');
  var btn = form.querySelector('button');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var box = document.getElementById('formMsg');
    box.className = 'msg';
    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();
    var message = document.getElementById('message').value.trim();
    if(!name){ box.className = 'msg err'; box.textContent = 'Falta tu nombre.'; return; }
    if(!ok(email)){ box.className = 'msg err'; box.textContent = 'Revisa tu correo, parece incompleto.'; return; }
    if(!message){ box.className = 'msg err'; box.textContent = 'Cuéntanos qué pasó, el mensaje está vacío.'; return; }
    btn.disabled = true;
    box.textContent = 'Enviando…';
    fetch('/soporte', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: name,
        email: email,
        category: document.getElementById('category').value,
        message: message,
        website: document.getElementById('website').value
      })
    }).then(function(r){ if(!r.ok) throw new Error('support_failed'); return r.json(); })
      .then(function(){
        box.className = 'msg ok';
        box.textContent = '¡Listo! Te respondemos por correo en cuanto podamos. 👾';
        form.reset();
      })
      .catch(function(){
        box.className = 'msg err';
        box.textContent = 'No pudimos enviar tu mensaje, intenta de nuevo en un momento.';
      })
      .finally(function(){ btn.disabled = false; });
  });
})();
</script>
</body></html>`;
}
