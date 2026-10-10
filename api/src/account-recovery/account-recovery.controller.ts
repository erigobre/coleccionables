import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { renderAccountRecoveryPage } from './account-recovery.page.js';

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

// Página pública enlazada desde el botón "¿No reconoces este cambio?" del
// correo de "tu contraseña cambió" (EmailService.sendPasswordChangedEmail).
@Controller('recuperar-cuenta')
export class AccountRecoveryController {
  @Get()
  page(@Query('email') email: string | undefined, @Res() res: Response) {
    res.status(200).set(PAGE_HEADERS).send(renderAccountRecoveryPage(email ?? null));
  }
}
