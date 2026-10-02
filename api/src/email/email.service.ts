import { Injectable, Logger } from '@nestjs/common';

const MAILJET_SEND_URL = 'https://api.mailjet.com/v3.1/send';
const APP_LANDING_URL = 'https://frikidex.com';
const LOGO_URL = 'https://frikidex.com/assets/frikidex-logo-horizontal-slogan-oscuro.png';
const PRIVACY_URL = 'https://frikidex.com/aviso-de-privacidad';
const NOCHE = '#16122B';
const LIMA = '#C6F432';

interface TransferInviteEmailParams {
  toEmail: string;
  fromUserName: string;
  itemName: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  // No debe romper al llamador si Mailjet falla o si las credenciales no
  // están configuradas todavía (mismo criterio que NotificationsService con
  // el push de Expo): siempre atrapa sus propios errores.
  async sendTransferInviteEmail({ toEmail, fromUserName, itemName }: TransferInviteEmailParams) {
    await this.send({
      toEmail,
      fromAddress: 'invite',
      subject: `${fromUserName} te envió ${itemName} 🎁`,
      html: buildTransferInviteHtml({ fromUserName, itemName }),
      logContext: `invitación a ${toEmail}`,
    });
  }

  // Aviso de seguridad (plan de Ajustes §"Backend: Ajustes y seguridad de
  // cuenta"): se manda siempre que cambia la contraseña, para que la persona
  // note un cambio que no hizo.
  async sendPasswordChangedEmail({ toEmail, userName }: { toEmail: string; userName: string }) {
    await this.send({
      toEmail,
      fromAddress: 'noreply',
      subject: 'Tu contraseña de Frikidex cambió',
      html: buildSimpleEmailHtml({
        heading: 'Tu contraseña cambió',
        bodyHtml: `
          <p>Hola ${escapeHtml(userName)},</p>
          <p>Tu contraseña de Frikidex se actualizó correctamente. Si no fuiste tú, cambia tu contraseña de inmediato y contacta a soporte.</p>
        `,
      }),
      logContext: `aviso de cambio de contraseña a ${toEmail}`,
    });
  }

  async sendEmailVerificationEmail({ toEmail, userName, token }: { toEmail: string; userName: string; token: string }) {
    const apiUrl = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? 'https://frikidex.com';
    const verifyUrl = `${apiUrl}/users/email/verify?token=${encodeURIComponent(token)}`;
    await this.send({
      toEmail,
      fromAddress: 'noreply',
      subject: 'Verifica tu correo en Frikidex',
      html: buildSimpleEmailHtml({
        heading: 'Verifica tu correo',
        bodyHtml: `
          <p>Hola ${escapeHtml(userName)},</p>
          <p>Toca el botón para confirmar que este correo es tuyo. El enlace vence en 24 horas.</p>
          ${button('Verificar mi correo', verifyUrl)}
        `,
      }),
      logContext: `verificación de correo a ${toEmail}`,
    });
  }

  // Decisión #2 del plan de Ajustes: la cuenta no se borra de inmediato, hay
  // 15 días de gracia (un login reactiva). Este correo explica eso.
  async sendAccountDeletionEmail({ toEmail, userName, deleteAfter }: { toEmail: string; userName: string; deleteAfter: Date }) {
    const formattedDate = deleteAfter.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    await this.send({
      toEmail,
      fromAddress: 'noreply',
      subject: 'Tu cuenta de Frikidex se eliminará en 15 días',
      html: buildSimpleEmailHtml({
        heading: 'Pediste eliminar tu cuenta',
        bodyHtml: `
          <p>Hola ${escapeHtml(userName)},</p>
          <p>Tu cuenta de Frikidex quedó desactivada. Si no vuelves a iniciar sesión antes del <strong>${formattedDate}</strong>, se eliminará de forma permanente.</p>
          <p>Si fue un error, simplemente inicia sesión de nuevo con tu contraseña antes de esa fecha y tu cuenta se reactivará sola.</p>
        `,
      }),
      logContext: `aviso de eliminación de cuenta a ${toEmail}`,
    });
  }

  // Camino "correo sin cuenta" de OrganizationsService.inviteOrCreateMember:
  // aquí no hay invitación que aceptar, la cuenta ya se creó de una vez, así
  // que solo se le avisa con la contraseña temporal para que inicie sesión.
  async sendMemberAccountCreatedEmail({
    toEmail,
    userName,
    temporaryPassword,
    inviterName,
    organizationName,
  }: { toEmail: string; userName: string; temporaryPassword: string; inviterName: string; organizationName: string }) {
    await this.send({
      toEmail,
      fromAddress: 'invite',
      subject: `${inviterName} te creó una cuenta en Frikidex`,
      html: buildSimpleEmailHtml({
        heading: `${escapeHtml(inviterName)} te agregó a su familia de FrikiTokens`,
        bodyHtml: `
          <p>Hola ${escapeHtml(userName)},</p>
          <p><strong>${escapeHtml(inviterName)}</strong> te creó una cuenta en Frikidex para compartir el monedero de FrikiTokens de "${escapeHtml(organizationName)}".</p>
          <p>Correo: <strong>${escapeHtml(toEmail)}</strong><br/>Contraseña temporal: <strong>${escapeHtml(temporaryPassword)}</strong></p>
          <p>Te recomendamos cambiarla desde Ajustes en cuanto inicies sesión.</p>
          ${button('Abrir Frikidex')}
        `,
      }),
      logContext: `alta de cuenta de familiar a ${toEmail}`,
    });
  }

  // Correo de respaldo cuando el push falla o el invitado no tiene el
  // dispositivo a la mano — misma invitación que ya le llegó por push
  // (OrganizationsService.inviteOrCreateMember, camino "cuenta existente").
  async sendOrganizationInviteEmail({ toEmail, inviterName, organizationName }: { toEmail: string; inviterName: string; organizationName: string }) {
    await this.send({
      toEmail,
      fromAddress: 'invite',
      subject: `${inviterName} te invitó a compartir FrikiTokens en Frikidex`,
      html: buildSimpleEmailHtml({
        heading: `${escapeHtml(inviterName)} te invitó a su familia de FrikiTokens`,
        bodyHtml: `
          <p><strong>${escapeHtml(inviterName)}</strong> te invitó a unirte a "${escapeHtml(organizationName)}" en Frikidex, para compartir el monedero de FrikiTokens de su suscripción.</p>
          <p>Abre la app para aceptar o rechazar la invitación.</p>
          ${button('Abrir Frikidex')}
        `,
      }),
      logContext: `invitación de Organization a ${toEmail}`,
    });
  }

  // Punto de entrada compartido para el resto de correos transaccionales
  // (no son invitaciones) — usan no-reply@frikidex.com por defecto.
  private async send({
    toEmail,
    fromAddress,
    subject,
    html,
    logContext,
  }: {
    toEmail: string;
    fromAddress: 'invite' | 'noreply';
    subject: string;
    html: string;
    logContext: string;
  }) {
    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_API_SECRET;
    const senderName = process.env.MAILJET_SENDER_NAME ?? 'Frikidex';
    const senderEmail =
      fromAddress === 'invite'
        ? process.env.MAILJET_SENDER_EMAIL_INVITE ?? 'invitacion@frikidex.com'
        : process.env.MAILJET_SENDER_EMAIL_NOREPLY ?? 'no-reply@frikidex.com';

    if (!apiKey || !apiSecret) {
      this.logger.warn(`MAILJET_API_KEY/MAILJET_API_SECRET no configuradas — no se envió el correo (${logContext})`);
      return;
    }

    try {
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const res = await fetch(MAILJET_SEND_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: senderEmail, Name: senderName },
              To: [{ Email: toEmail }],
              Subject: subject,
              HTMLPart: html,
            },
          ],
        }),
      });

      if (!res.ok) {
        this.logger.error(`Mailjet respondió ${res.status} al enviar (${logContext})`);
      }
    } catch (err) {
      this.logger.error(`Fallo al enviar correo (${logContext})`, err instanceof Error ? err.stack : err);
    }
  }
}

// Correo completo (no solo un fragmento) para poder fijar
// color-scheme/supported-color-schemes en el <head>: sin eso, clientes como
// Outlook.com, iOS Mail o Gmail en modo oscuro reprocesan/recolorean los
// <a> y pueden mostrar el verde de marca desviado o apagado. El logo va en
// un bloque con fondo Noche fijo (no depende de si el fondo del correo es
// claro u oscuro) usando la variante del logo hecha para fondos oscuros.
function button(label: string, href: string = APP_LANDING_URL): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-block; margin: 8px;">
      <tr>
        <td bgcolor="${LIMA}" align="center" style="background-color: ${LIMA} !important; border-radius: 8px;">
          <a href="${href}" style="display: inline-block; padding: 12px 20px; font-family: sans-serif; font-weight: bold; text-decoration: none; color: ${NOCHE} !important; mso-color-alt: ${NOCHE};">
            <span style="color: ${NOCHE} !important;">${label}</span>
          </a>
        </td>
      </tr>
    </table>
  `;
}

function buildTransferInviteHtml({ fromUserName, itemName }: { fromUserName: string; itemName: string }): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Frikidex</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #ffffff;">
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px 16px; color: ${NOCHE}; background-color: #ffffff;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td bgcolor="${NOCHE}" align="left" style="background-color: ${NOCHE}; padding: 20px 24px; border-radius: 12px;">
            <img src="${LOGO_URL}" alt="Frikidex — La dex de tus coleccionables" width="220" style="display: block; border: 0;" />
          </td>
        </tr>
      </table>
      <h2 style="color: ${NOCHE};">¡${escapeHtml(fromUserName)} te envió un objeto!</h2>
      <p><strong>${escapeHtml(fromUserName)}</strong> te acaba de enviar <strong>${escapeHtml(itemName)}</strong> para agregarlo a tu colección en Frikidex.</p>
      <p>Para aceptarlo, descarga la app e inscríbete con este mismo correo:</p>
      <div style="text-align: center; margin: 24px 0 8px;">
        ${button('Descargar para iOS')}
        ${button('Descargar para Android')}
      </div>
      <p>Tienes 7 días para aceptarlo antes de que la transferencia expire.</p>
      <hr style="border: none; border-top: 1px solid #EDE7DA; margin: 24px 0;" />
      <p style="font-size: 12px; color: #5B5470; line-height: 1.5;">
        Este correo fue enviado por Frikidex (<a href="${APP_LANDING_URL}" style="color: #5B5470;">frikidex.com</a>) a solicitud
        de ${escapeHtml(fromUserName)}, quien inició esta transferencia hacia tu dirección. Tu correo no se almacena con fines
        de mercadotecnia ni se comparte con terceros — se utiliza únicamente para esta notificación. Si no esperabas este
        mensaje, puedes ignorarlo sin problema.
      </p>
      <p style="font-size: 12px;">
        <a href="${PRIVACY_URL}" style="color: #6D4AFF;">Aviso de privacidad</a>
      </p>
    </div>
  </body>
</html>`;
}

// Layout compartido para los correos transaccionales simples (cambio de
// contraseña, verificación de correo, aviso de eliminación, invitación a
// Organization) — mismo encabezado/pie que buildTransferInviteHtml, sin
// repetir el boilerplate de cada uno.
function buildSimpleEmailHtml({ heading, bodyHtml }: { heading: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Frikidex</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #ffffff;">
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px 16px; color: ${NOCHE}; background-color: #ffffff;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <tr>
          <td bgcolor="${NOCHE}" align="left" style="background-color: ${NOCHE}; padding: 20px 24px; border-radius: 12px;">
            <img src="${LOGO_URL}" alt="Frikidex — La dex de tus coleccionables" width="220" style="display: block; border: 0;" />
          </td>
        </tr>
      </table>
      <h2 style="color: ${NOCHE};">${heading}</h2>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #EDE7DA; margin: 24px 0;" />
      <p style="font-size: 12px; color: #5B5470; line-height: 1.5;">
        Este correo fue enviado por Frikidex (<a href="${APP_LANDING_URL}" style="color: #5B5470;">frikidex.com</a>). Si no esperabas
        este mensaje, puedes ignorarlo sin problema.
      </p>
      <p style="font-size: 12px;">
        <a href="${PRIVACY_URL}" style="color: #6D4AFF;">Aviso de privacidad</a>
      </p>
    </div>
  </body>
</html>`;
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
